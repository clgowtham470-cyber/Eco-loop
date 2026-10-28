"""
Hybrid detector:
  1. YOLO (fast, local) finds every object and draws boxes.
  2. Gemini Vision (smart, cloud) looks at the same photo, catches items YOLO
     missed, and adds condition info (dirty / cap on / broken).
  3. Results are merged by box overlap (IoU) and enriched from categories.py.

Works with whatever is available:
  - YOLO + Gemini  -> best
  - YOLO only      -> offline mode (no internet needed)
  - Gemini only    -> if ultralytics is not installed
Set DETECTOR=demo to get sample results for UI testing without any model.
"""
import io
import json
import os
import re

from PIL import Image

from categories import CATEGORIES, LABELS, enrich

DETECTOR = os.getenv("DETECTOR", "auto")  # auto | yolo | gemini | demo
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
YOLO_CONF = float(os.getenv("YOLO_CONF", "0.25"))
TRUST_CONF = 0.5  # above this YOLO is trusted on its own
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")

# COCO classes that are never waste (people, furniture, vehicles...)
IGNORE = {"person", "dining table", "bed", "couch", "car", "truck", "bus", "motorcycle",
          "bicycle", "train", "airplane", "boat", "dog", "cat", "bird", "horse", "sink",
          "toilet", "refrigerator", "oven", "microwave", "bench", "traffic light"}

_yolo = None
_yolo_custom = False
_gemini = None
status = {"yolo": False, "gemini": False, "yolo_weights": None, "mode": DETECTOR}


def load():
    """Load models once at server start."""
    global _yolo, _yolo_custom, _gemini
    if DETECTOR in ("auto", "yolo"):
        try:
            from ultralytics import YOLO

            custom = os.path.join(WEIGHTS_DIR, "best.pt")
            if os.path.exists(custom):
                _yolo, _yolo_custom = YOLO(custom), True
                status["yolo_weights"] = "weights/best.pt (custom)"
            else:
                _yolo = YOLO("yolov8n.pt")  # auto-downloads once (~6 MB)
                status["yolo_weights"] = "yolov8n.pt (COCO default)"
            status["yolo"] = True
        except Exception as e:  # ultralytics missing or no internet for weights
            status["yolo_error"] = str(e)[:200]
    if DETECTOR in ("auto", "gemini") and os.getenv("GEMINI_API_KEY"):
        try:
            from google import genai

            _gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            status["gemini"] = True
        except Exception as e:
            status["gemini_error"] = str(e)[:200]
    return status


def gemini_client():
    return _gemini


# Model names change over time and not every key can use every model.
# Try these in order and remember the first one that works.
_MODEL_CHAIN = list(dict.fromkeys([GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-3.8-flash",
                                   "gemini-flash-latest", "gemini-2.5-flash"]))
_working_model = None


def explain(e):
    """Turn a Google API error into one readable line."""
    msg = str(e)
    low = msg.lower()
    if "api_key_invalid" in low or "api key not valid" in low:
        return "Gemini API key is invalid. Copy it again from aistudio.google.com/apikey into backend/.env."
    if "429" in msg or "resource_exhausted" in low or "quota" in low:
        return "Gemini free quota reached for now. Wait a minute, or create a new key."
    if "permission" in low or "403" in msg:
        return "This Gemini key is not allowed to use the API. Create a new key in AI Studio."
    if "location" in low or "region" in low:
        return "Gemini is not available from this network location."
    return f"Gemini error: {msg[:160]}"


def gemini_generate(contents, config):
    """Call Gemini, falling back through model names on 'model not found'."""
    global _working_model
    last = None
    for model in ([_working_model] if _working_model else []) + _MODEL_CHAIN:
        try:
            resp = _gemini.models.generate_content(model=model, contents=contents, config=config)
            if _working_model != model:
                print(f"[gemini] using model {model}")
            _working_model = model
            return resp
        except Exception as e:
            last = e
            text = str(e).lower()
            retired = "not_found" in text or "404" in text or "not found" in text or "not supported" in text
            busy = "503" in text or "unavailable" in text or "overloaded" in text or "high demand" in text
            if retired or busy:
                print(f"[gemini] model {model} {'busy' if busy else 'unavailable'}, trying next")
                if _working_model == model:
                    _working_model = None
                continue
            print(f"[gemini] {type(e).__name__}: {str(e)[:300]}")
            raise
    raise last


# ---------------- helpers ----------------
class ImageProblem(ValueError):
    """Raised with a message that is safe to show to the user."""


try:  # optional: lets the server read iPhone HEIC/HEIF photos
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIF = True
except Exception:
    HEIF = False
status["heic"] = HEIF


def prepare(data: bytes, max_side=1280):
    from PIL import ImageOps, UnidentifiedImageError

    head = data[:32]
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, ValueError):
        if b"ftyphei" in head or b"ftypmif1" in head or b"ftypheix" in head or b"ftyphevc" in head:
            raise ImageProblem("This is an iPhone HEIC photo. Run `pip install pillow-heif` on the server, "
                               "or set the iPhone camera to 'Most Compatible' (JPG) and try again.")
        if head.lstrip()[:1] in (b"<", b"{"):
            raise ImageProblem("That file is not a photo. Choose a JPG or PNG image.")
        raise ImageProblem("This photo could not be read. It may be damaged or in an unusual format. Try a JPG or PNG.")
    try:
        img = ImageOps.exif_transpose(img)  # respect phone camera rotation
    except Exception:
        pass
    if getattr(img, "is_animated", False):
        img.seek(0)
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGB", rgba.size, (255, 255, 255))
        bg.paste(rgba, mask=rgba.split()[-1])
        img = bg
    elif img.mode in ("I;16", "I;16B", "I;16L", "I", "F"):
        img = img.convert("I").point(lambda v: v / 256).convert("L").convert("RGB")
    else:
        img = img.convert("RGB")
    if min(img.size) < 16:
        raise ImageProblem("This image is too small to analyse. Use a normal photo.")
    img.thumbnail((max_side, max_side))
    return img


def thumbnail(img, side=360):
    import base64
    t = img.copy()
    t.thumbnail((side, side))
    buf = io.BytesIO()
    t.save(buf, "JPEG", quality=72)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0


# ---------------- YOLO ----------------
def run_yolo(img):
    if not _yolo:
        return []
    res = _yolo.predict(img, conf=YOLO_CONF, verbose=False)[0]
    out = []
    for b in res.boxes:
        label = res.names[int(b.cls)].lower()
        if not _yolo_custom and (label in IGNORE or label not in LABELS):
            continue
        conf = float(b.conf)
        out.append({
            "label": label,
            "box": [round(v, 1) for v in b.xyxy[0].tolist()],
            "confidence": round(conf, 3),
            "source": "yolo",
            "low_confidence": conf < TRUST_CONF,
        })
    return out


# ---------------- Gemini ----------------
GEMINI_PROMPT = """You are a waste-sorting expert for India. List EVERY separate waste item visible.
Return ONLY a JSON array. Each element:
{"label": short common name (e.g. "plastic bottle", "battery", "banana peel"),
 "category": one of "recyclable","reusable","biodegradable","hazardous",
 "material": one of %s,
 "condition": "clean" or a short problem like "cap on","food residue","wet","broken",
 "instruction": one short sentence on how to dispose of it correctly in India,
 "weight_g": estimated weight in grams (number),
 "box_2d": [ymin, xmin, ymax, xmax] normalised 0-1000}
Rules:
- Be thorough: list EVERY separate object, including ones that are partly hidden, small,
  crushed or overlapping. A cluttered pile usually has 10-30 items. Do not merge similar items.
- Use "hazardous" only for batteries, electronics, bulbs/tubes, medicines, syringes,
  paint/chemical/aerosol cans. Do not guess hazardous for ordinary bottles or tubes.
- One entry per physical object; boxes should tightly fit that object.
If you see nothing, return []."""


def run_gemini(img):
    if not _gemini:
        return []
    from categories import MATERIALS

    prompt = GEMINI_PROMPT % json.dumps(list(MATERIALS))
    resp = gemini_generate([img, prompt], {"response_mime_type": "application/json", "temperature": 0})
    text = resp.text or "[]"
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\[.*\]", text, re.S)
        data = json.loads(m.group(0)) if m else []
    if isinstance(data, dict):
        data = data.get("items", [])
    W, H = img.size
    out = []
    for d in data:
        if not isinstance(d, dict) or not d.get("label"):
            continue
        box = None
        b = d.get("box_2d")
        if isinstance(b, list) and len(b) == 4:
            y1, x1, y2, x2 = [float(v) for v in b]
            box = [x1 / 1000 * W, y1 / 1000 * H, x2 / 1000 * W, y2 / 1000 * H]
        out.append({
            "label": str(d["label"]).lower(),
            "category": d.get("category"),
            "material": d.get("material"),
            "condition": d.get("condition", "clean"),
            "instruction": d.get("instruction"),
            "weight_g": d.get("weight_g"),
            "box": box,
            "confidence": 0.8,
            "source": "gemini",
        })
    return out


# ---------------- demo (UI testing only) ----------------
def run_demo(img):
    W, H = img.size
    sample = [("plastic bottle", .08, .15, .30, .80, "cap on"), ("battery", .38, .55, .48, .75, "clean"),
              ("banana", .55, .20, .85, .45, "clean"), ("newspaper", .55, .55, .95, .95, "clean"),
              ("can", .35, .15, .50, .40, "clean")]
    return [{"label": l, "box": [x1 * W, y1 * H, x2 * W, y2 * H], "confidence": 0.9,
             "condition": c, "source": "demo"} for l, x1, y1, x2, y2, c in sample]


# ---------------- main entry ----------------
def detect(data: bytes):
    img = prepare(data)
    W, H = img.size
    notes = []

    if DETECTOR == "demo":
        items, source = run_demo(img), "demo"
    else:
        yolo_items = run_yolo(img) if DETECTOR in ("auto", "yolo") else []
        gem_items = []
        if DETECTOR in ("auto", "gemini") and _gemini:
            try:
                gem_items = run_gemini(img)
            except Exception as e:  # never crash the demo because the cloud failed
                notes.append(explain(e) + ("" if status["yolo"] else " No local model installed, so nothing could be detected."))

        # merge: Gemini enriches overlapping YOLO boxes, adds what YOLO missed
        items = []
        used = set()
        for y in yolo_items:
            best, best_i = 0, None
            for i, g in enumerate(gem_items):
                if g["box"] and i not in used:
                    s = iou(y["box"], g["box"])
                    if s > best:
                        best, best_i = s, i
            if best_i is not None and best > 0.3:
                g = gem_items[best_i]
                used.add(best_i)
                y.update({k: g[k] for k in ("label", "category", "material", "condition",
                                            "instruction", "weight_g") if g.get(k)})
                y["source"] = "yolo+gemini"
                y["low_confidence"] = False
                items.append(y)
            elif not y["low_confidence"] or not gem_items:
                items.append(y)  # trusted YOLO hit (or no second opinion available)
            # else: low-confidence YOLO hit that Gemini didn't confirm -> dropped
        items += [g for i, g in enumerate(gem_items) if i not in used]
        source = "+".join(s for s, ok in (("yolo", yolo_items or status["yolo"]),
                                          ("gemini", gem_items)) if ok) or "none"
        if not status["yolo"] and not status["gemini"]:
            notes.append("No detector loaded. Install ultralytics or set GEMINI_API_KEY.")

    items = [enrich(it) for it in items]
    for n, it in enumerate(items):
        it["id"] = n
        it["box"] = [round(max(0, v), 1) for v in it["box"]] if it.get("box") else None
    return {"width": W, "height": H, "items": items, "source": source,
            "summary": summarize(items), "notes": notes, "thumb": thumbnail(img),
            "preview": thumbnail(img, 1280)}


def summarize(items):
    counts = {k: 0 for k in CATEGORIES}
    for it in items:
        counts[it["category"]] += 1
    return {
        "total": len(items),
        "counts": counts,
        "value_rs": round(sum(i["value_rs"] for i in items), 2),
        "co2_saved_kg": round(sum(i["co2_saved_kg"] for i in items), 3),
        "weight_kg": round(sum(i["weight_g"] for i in items) / 1000, 3),
        "hazardous": [i["label"] for i in items if i["category"] == "hazardous"],
        "needs_cleaning": [i["label"] for i in items
                           if i.get("condition") not in ("clean", "ok", None, "")],
    }
