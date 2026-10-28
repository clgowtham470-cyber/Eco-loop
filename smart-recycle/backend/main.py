"""
EcoLoop backend - FastAPI.
Run:  uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
import os
import sqlite3


def _load_env():
    p = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

import db  # noqa: E402
import detector  # noqa: E402
import genai  # noqa: E402
import twin  # noqa: E402
from categories import CATEGORIES  # noqa: E402

app = FastAPI(title="EcoLoop - Smart Recycling Assistant")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def startup():
    db.init()
    print("Detector status:", detector.load())


# ---------------- auth ----------------
class Register(BaseModel):
    name: str
    email: str
    password: str


class Login(BaseModel):
    email: str
    password: str


def current_user(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    user = db.user_for_token(token) if token else None
    if not user:
        raise HTTPException(401, "Please log in again.")
    return user


@app.post("/api/auth/register")
def register(body: Register):
    if len(body.password) < 6:
        raise HTTPException(400, "Password needs at least 6 characters.")
    if "@" not in body.email:
        raise HTTPException(400, "Enter a valid email address.")
    try:
        uid = db.create_user(body.name.strip() or "Recycler", body.email.strip(), body.password)
    except sqlite3.IntegrityError:
        raise HTTPException(400, "An account with this email already exists. Log in instead.")
    return {"token": db.new_session(uid), "user": {"id": uid, "name": body.name, "email": body.email}}


@app.post("/api/auth/login")
def login(body: Login):
    u = db.check_user(body.email.strip(), body.password)
    if not u:
        raise HTTPException(401, "Email or password is incorrect.")
    return {"token": db.new_session(u["id"]), "user": {"id": u["id"], "name": u["name"], "email": u["email"]}}


@app.post("/api/auth/logout")
def logout(authorization: str = Header(default="")):
    db.drop_session(authorization.removeprefix("Bearer ").strip())
    return {"ok": True}


@app.get("/api/me")
def me(user=Depends(current_user)):
    return user


# ---------------- core ----------------
@app.get("/api/health")
def health():
    from categories import PRICES_UPDATED
    return {"ok": True, "detector": detector.status, "categories": CATEGORIES, "prices_updated": PRICES_UPDATED}


@app.get("/api/media")
def media():
    """Which optional local media files exist (offline video, card photos)."""
    root = os.path.join(os.path.dirname(__file__), "..", "frontend")
    found = set()
    for base in ("dist", "public"):
        d = os.path.join(root, base, "media")
        for dirpath, _, files in os.walk(d):
            for f in files:
                if not f.startswith("."):
                    found.add(os.path.relpath(os.path.join(dirpath, f), os.path.join(root, base)).replace(os.sep, "/"))
    return {"files": sorted(found)}


@app.post("/api/detect")
async def detect(file: UploadFile = File(...), user=Depends(current_user)):
    data = await file.read()
    if not data:
        raise HTTPException(400, "The image is empty. Try another photo.")
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "Image is larger than 15 MB. Use a smaller photo.")
    try:
        result = detector.detect(data)
    except detector.ImageProblem as e:
        raise HTTPException(400, str(e))
    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, "Something went wrong while analysing this photo. Try again, or try another photo.")
    thumb = result.get("thumb")
    result["scan_id"] = db.save_scan(user["id"], result["width"], result["height"],
                                     result["source"], result["items"], result["summary"], thumb)
    return result


@app.get("/api/twin")
def get_twin(scope: str = "me", user=Depends(current_user)):
    items = db.items_for(None if scope == "all" else user["id"])
    return twin.build(items)


class Sim(BaseModel):
    households: int = Field(1000, ge=1, le=10_000_000)
    days: int = Field(30, ge=1, le=3650)
    segregation_pct: float = Field(40, ge=0, le=100)
    contamination_pct: float = Field(30, ge=0, le=100)


@app.post("/api/simulate")
def simulate(body: Sim, user=Depends(current_user)):
    return twin.simulate(db.items_for(user["id"]), **body.model_dump())


@app.get("/api/stats")
def stats(user=Depends(current_user)):
    return twin.stats(db.items_for(user["id"]))


@app.get("/api/history")
def history(user=Depends(current_user)):
    return db.scans_for(user["id"])


class Rec(BaseModel):
    lang: str = Field("en", max_length=5)


@app.post("/api/recommend")
def recommend(body: Rec, user=Depends(current_user)):
    return genai.recommend(twin.stats(db.items_for(user["id"])), body.lang)


class Ask(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    history: list = []
    lang: str = "en"


@app.post("/api/coach")
def coach(body: Ask, user=Depends(current_user)):
    return genai.coach(body.question, twin.stats(db.items_for(user["id"])), body.history, body.lang)


# ---------------- serve built frontend (one port for ngrok demo) ----------------
DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = os.path.join(DIST, path)
        if path.startswith("media/") and not os.path.isfile(f):
            raise HTTPException(404, "Not found")
        return FileResponse(f if path and os.path.isfile(f) else os.path.join(DIST, "index.html"))
