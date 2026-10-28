"""SQLite storage: users, sessions, scans and items. Zero setup."""
import hashlib
import json
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "recycle.db"))


@contextmanager
def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    with conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS users(
              id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE,
              pw_hash TEXT, salt TEXT, created REAL);
            CREATE TABLE IF NOT EXISTS sessions(
              token TEXT PRIMARY KEY, user_id INTEGER, created REAL);
            CREATE TABLE IF NOT EXISTS scans(
              id INTEGER PRIMARY KEY, user_id INTEGER, created REAL,
              image_w INTEGER, image_h INTEGER, source TEXT, summary TEXT);
            CREATE TABLE IF NOT EXISTS items(
              id INTEGER PRIMARY KEY, scan_id INTEGER, user_id INTEGER, created REAL,
              label TEXT, category TEXT, material TEXT, condition TEXT,
              weight_g REAL, value_rs REAL, co2_saved_kg REAL, confidence REAL,
              source TEXT, data TEXT);
            """
        )
        # older databases: add the thumbnail column if missing
        try:
            c.execute("ALTER TABLE scans ADD COLUMN thumb TEXT")
        except sqlite3.OperationalError:
            pass


# ---------- auth ----------
def _hash(pw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 120_000).hex()


def create_user(name, email, pw):
    salt = secrets.token_hex(16)
    with conn() as c:
        cur = c.execute(
            "INSERT INTO users(name,email,pw_hash,salt,created) VALUES(?,?,?,?,?)",
            (name, email.lower(), _hash(pw, salt), salt, time.time()),
        )
        return cur.lastrowid


def check_user(email, pw):
    with conn() as c:
        r = c.execute("SELECT * FROM users WHERE email=?", (email.lower(),)).fetchone()
    if r and secrets.compare_digest(r["pw_hash"], _hash(pw, r["salt"])):
        return dict(r)
    return None


def new_session(user_id):
    token = secrets.token_urlsafe(32)
    with conn() as c:
        c.execute("INSERT INTO sessions VALUES(?,?,?)", (token, user_id, time.time()))
    return token


def user_for_token(token):
    with conn() as c:
        r = c.execute(
            "SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?",
            (token,),
        ).fetchone()
    return dict(r) if r else None


def drop_session(token):
    with conn() as c:
        c.execute("DELETE FROM sessions WHERE token=?", (token,))


# ---------- scans ----------
def save_scan(user_id, w, h, source, items, summary, thumb=None):
    now = time.time()
    with conn() as c:
        sid = c.execute(
            "INSERT INTO scans(user_id,created,image_w,image_h,source,summary,thumb) VALUES(?,?,?,?,?,?,?)",
            (user_id, now, w, h, source, json.dumps(summary), thumb),
        ).lastrowid
        for it in items:
            c.execute(
                """INSERT INTO items(scan_id,user_id,created,label,category,material,condition,
                   weight_g,value_rs,co2_saved_kg,confidence,source,data)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (sid, user_id, now, it["label"], it["category"], it["material"],
                 it.get("condition", "clean"), it["weight_g"], it["value_rs"],
                 it["co2_saved_kg"], it.get("confidence", 0), it.get("source", ""), json.dumps(it)),
            )
    return sid


def items_for(user_id=None):
    q, args = "SELECT * FROM items", ()
    if user_id is not None:
        q, args = q + " WHERE user_id=?", (user_id,)
    with conn() as c:
        return [dict(r) for r in c.execute(q + " ORDER BY created", args)]


def scans_for(user_id, limit=50):
    with conn() as c:
        rows = c.execute(
            "SELECT * FROM scans WHERE user_id=? ORDER BY created DESC LIMIT ?", (user_id, limit)
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["summary"] = json.loads(d["summary"] or "{}")
        out.append(d)
    return out
