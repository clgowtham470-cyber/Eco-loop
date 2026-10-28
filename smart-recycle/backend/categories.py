"""
Material knowledge base: maps a detected label -> category, material,
disposal instruction, typical weight and scrap value.

Categories (the 4 required by the problem statement):
  recyclable | reusable | biodegradable | hazardous

Numbers (weight, scrap price, CO2 factor) are rough demo estimates.
Replace them with local figures before the final pitch if you can.
"""

CATEGORIES = {
    "recyclable": {"label": "Recyclable", "bin": "Dry waste bin", "color": "#2563EB"},
    "reusable": {"label": "Reusable", "bin": "Keep / donate", "color": "#7C3AED"},
    "biodegradable": {"label": "Biodegradable", "bin": "Wet waste bin", "color": "#16A34A"},
    "hazardous": {"label": "Hazardous", "bin": "Hazardous waste drop-off", "color": "#DC2626"},
}

# material -> (scrap value in Rs/kg paid to a household by a kabadiwala, kg CO2e saved per kg diverted)
# Prices: indicative mid-range household selling rates in Indian cities, checked Aug 2026 against
#   kabadidost.in/scrap-rates (Jul 2026), scrapbuddy.org/pricing (Mumbai, 8 Aug 2026),
#   kabadiwalaonline.in/price-list (Delhi NCR, Aug 2026). Metro rates run ~5-8% higher.
# Small household batteries (AA/AAA) and medicines have no resale value: they cost money to treat safely.
PRICES_UPDATED = "Aug 2026"
# whole devices are bought per piece, not by weight (scrapbuddy.org Mumbai Aug 2026; kabadiwalaonline.in Delhi NCR)
PIECE_PRICE = {"cell phone": 120, "laptop": 300}
MATERIALS = {
    "PET plastic": (15, 1.5),     # PET bottles Rs 10-20/kg
    "HDPE plastic": (18, 1.2),    # hard plastic Rs 15-30/kg
    "mixed plastic": (7, 1.0),    # soft/film plastic Rs 5-15/kg
    "aluminium": (110, 9.0),      # aluminium scrap Rs 95-170/kg
    "steel": (30, 1.8),           # iron / loha Rs 24-42/kg
    "glass": (1, 0.3),            # most collectors pay little or nothing for glass
    "paper": (13, 0.9),           # newspaper Rs 12-18, books/office paper Rs 8-14/kg
    "cardboard": (9, 0.9),        # carton Rs 6-14/kg
    "organic": (0, 0.5),
    "textile": (4, 3.0),          # old clothes Rs 2-6/kg
    "e-waste": (30, 2.0),         # mixed e-waste Rs 20-90/kg (whole appliances priced per piece)
    "battery": (0, 1.0),          # small cells: no resale value (inverter/car lead batteries do sell)
    "chemical": (0, 0.5),
    "wood": (3, 0.4),
    "other": (0, 0.2),
}

# label -> (category, material, avg weight in grams, instruction)
LABELS = {
    # --- COCO labels (default yolov8n.pt works out of the box) ---
    "bottle": ("recyclable", "PET plastic", 25, "Empty it, remove the cap, rinse, flatten, then dry bin."),
    "wine glass": ("reusable", "glass", 150, "Reuse it or give it away. Broken glass: wrap in paper and label it."),
    "cup": ("recyclable", "paper", 12, "Paper cups have a plastic lining. Rinse and put in dry waste."),
    "fork": ("reusable", "steel", 30, "Wash and reuse. Plastic cutlery goes in dry waste."),
    "knife": ("reusable", "steel", 40, "Wash and reuse. Wrap sharp edges before disposal."),
    "spoon": ("reusable", "steel", 25, "Wash and reuse."),
    "bowl": ("reusable", "mixed plastic", 80, "Wash and reuse, or donate."),
    "banana": ("biodegradable", "organic", 40, "Wet bin or home compost."),
    "apple": ("biodegradable", "organic", 30, "Wet bin or home compost."),
    "orange": ("biodegradable", "organic", 40, "Wet bin. Dried peels can be reused as a cleaner."),
    "sandwich": ("biodegradable", "organic", 80, "Wet bin. Remove any plastic wrap first."),
    "broccoli": ("biodegradable", "organic", 30, "Wet bin or compost."),
    "carrot": ("biodegradable", "organic", 20, "Wet bin or compost."),
    "pizza": ("biodegradable", "organic", 60, "Food goes in wet bin. Greasy boxes cannot be recycled as paper."),
    "donut": ("biodegradable", "organic", 40, "Wet bin."),
    "cake": ("biodegradable", "organic", 60, "Wet bin."),
    "potted plant": ("biodegradable", "organic", 300, "Compost the plant. Reuse the pot."),
    "book": ("reusable", "paper", 300, "Donate or sell. Damaged books go to paper recycling."),
    "cell phone": ("hazardous", "e-waste", 180, "E-waste. Take to an authorised e-waste collector. Never bin it."),
    "laptop": ("hazardous", "e-waste", 2000, "E-waste. Wipe your data, then use an authorised recycler or take-back."),
    "keyboard": ("hazardous", "e-waste", 600, "E-waste collection point."),
    "mouse": ("hazardous", "e-waste", 90, "E-waste collection point."),
    "remote": ("hazardous", "e-waste", 120, "Remove the batteries (hazardous) and send both to e-waste."),
    "tv": ("hazardous", "e-waste", 8000, "E-waste. Use a brand take-back or an authorised recycler."),
    "scissors": ("reusable", "steel", 60, "Reuse or donate. Wrap blades before disposal."),
    "toothbrush": ("recyclable", "mixed plastic", 20, "Dry waste. Consider bamboo next time."),
    "handbag": ("reusable", "textile", 400, "Donate or repair."),
    "backpack": ("reusable", "textile", 500, "Donate or repair."),
    "umbrella": ("reusable", "steel", 350, "Repair, or separate metal frame and fabric."),
    "suitcase": ("reusable", "mixed plastic", 3000, "Donate or repair."),
    "vase": ("reusable", "glass", 400, "Reuse or donate."),
    "clock": ("hazardous", "e-waste", 300, "Remove the battery. Electronic parts go to e-waste."),
    "hair drier": ("hazardous", "e-waste", 500, "E-waste collection point."),
    "teddy bear": ("reusable", "textile", 200, "Wash and donate."),
    "chair": ("reusable", "wood", 5000, "Repair, donate, or sell to a scrap dealer."),
    # --- TACO / litter-model labels (if you use a Roboflow litter model) ---
    "plastic bottle": ("recyclable", "PET plastic", 25, "Empty, remove cap, rinse, flatten, dry bin."),
    "bottle cap": ("recyclable", "HDPE plastic", 2, "Collect caps separately. They are a different plastic."),
    "can": ("recyclable", "aluminium", 15, "Rinse and crush. Aluminium has high scrap value."),
    "aluminium foil": ("recyclable", "aluminium", 5, "Clean foil only. Ball it up before binning."),
    "glass bottle": ("recyclable", "glass", 350, "Rinse. Return to the shop or sell to a scrap dealer."),
    "glass jar": ("reusable", "glass", 250, "Wash and reuse for storage."),
    "carton": ("recyclable", "cardboard", 30, "Rinse, flatten, dry bin."),
    "cardboard": ("recyclable", "cardboard", 150, "Flatten and keep dry. Wet cardboard loses value."),
    "paper": ("recyclable", "paper", 5, "Keep dry and clean. Dry bin."),
    "newspaper": ("recyclable", "paper", 100, "Bundle and sell to a scrap dealer."),
    "plastic bag": ("recyclable", "mixed plastic", 5, "Reuse, or drop at a plastic collection point."),
    "plastic wrapper": ("recyclable", "mixed plastic", 3, "Multi-layer wrappers: clean and put in dry waste."),
    "styrofoam": ("recyclable", "mixed plastic", 10, "Hard to recycle. Dry waste. Avoid buying it."),
    "straw": ("recyclable", "mixed plastic", 1, "Dry waste. Single-use plastic straws are banned in India."),
    "cigarette": ("hazardous", "chemical", 1, "Toxic filter. Stub out fully and put in dry waste, never on the ground."),
    "food waste": ("biodegradable", "organic", 100, "Wet bin or compost."),
    "battery": ("hazardous", "battery", 25, "Never bin batteries. Take to an e-waste or battery drop point."),
    "light bulb": ("hazardous", "glass", 60, "CFLs contain mercury. Take to a hazardous collection point."),
    "medicine": ("hazardous", "chemical", 20, "Return expired medicine to a pharmacy take-back. Never flush."),
    "syringe": ("hazardous", "chemical", 10, "Biomedical waste. Seal it in a hard container and give to a hospital."),
    "paint can": ("hazardous", "chemical", 500, "Hazardous waste drop-off. Do not pour paint in drains."),
    "spray can": ("hazardous", "aluminium", 150, "Pressurised. Empty fully and drop at a hazardous collection point."),
    "cloth": ("reusable", "textile", 200, "Donate, upcycle into rags, or textile recycling."),
    "shoe": ("reusable", "textile", 400, "Donate or repair."),
}


def lookup(label: str):
    """Return knowledge for a label, with a safe default for unknown labels."""
    key = (label or "").strip().lower()
    if key in LABELS:
        cat, mat, w, ins = LABELS[key]
    else:
        # fuzzy: match any known label contained in the text
        hit = next((k for k in LABELS if k in key), None)
        if hit:
            cat, mat, w, ins = LABELS[hit]
        else:
            cat, mat, w, ins = ("recyclable", "other", 50, "Unclear item. Check the local dry-waste rules.")
    value, co2 = MATERIALS.get(mat, MATERIALS["other"])
    return {
        "category": cat,
        "material": mat,
        "weight_g": w,
        "instruction": ins,
        "value_per_kg": value,
        "co2_per_kg": co2,
    }


def enrich(item: dict) -> dict:
    """Fill in missing fields of a detected item from the knowledge base."""
    base = lookup(item.get("label", ""))
    out = {**base, "condition": "clean", **{k: v for k, v in item.items() if v not in (None, "")}}
    if out.get("category") not in CATEGORIES:
        out["category"] = base["category"]
    if out.get("material") not in MATERIALS:
        out["material"] = base["material"]
    value, co2 = MATERIALS[out["material"]]
    out["value_per_kg"], out["co2_per_kg"] = value, co2
    w = float(out.get("weight_g") or base["weight_g"])
    out["weight_g"] = w
    # contaminated recyclables are worth nothing until cleaned
    clean = out.get("condition", "clean") in ("clean", "ok", "", None)
    piece = PIECE_PRICE.get(str(out.get("label", "")).strip().lower())
    out["value_rs"] = float(piece) if piece else round(w / 1000 * value * (1 if clean else 0.3), 2)
    out["co2_saved_kg"] = round(w / 1000 * co2, 3)
    return out
