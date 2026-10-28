# EcoLoop — Smart Recycling Assistant

Photograph a pile of waste. EcoLoop finds every item, sorts it into **recyclable,
reusable, biodegradable or hazardous**, tracks where it goes in a **Digital Twin**,
and gives **AI-written personal advice** in five Indian languages.

---

## 1. One-time setup (15 minutes)

You need **Python 3.10+** and **Node.js 18+** installed.

### Get a free Gemini API key
1. Go to https://aistudio.google.com/apikey and click **Create API key**.
2. Copy it.

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac / Linux
pip install -r requirements.txt
copy .env.example .env          # Windows  (Mac/Linux: cp .env.example .env)
```
Open `backend/.env` and paste your key after `GEMINI_API_KEY=`.

> `ultralytics` (YOLO) pulls in PyTorch, a big download (~1–2 GB). Start it early.
> If it fails, the app still works with Gemini only.

### Frontend
```bash
cd frontend
npm install
```

---

## 2. Run it

**Development** (two terminals, auto-reload):
```bash
# terminal 1
cd backend && .venv\Scripts\activate && uvicorn main:app --reload --port 8000
# terminal 2
cd frontend && npm run dev
```
Open http://localhost:5173 and create an account.

**Demo mode** (one terminal, one port, works on phones):
```bash
cd frontend && npm run build
cd ../backend && uvicorn main:app --port 8000
```
Open http://localhost:8000.

**On your phone:** install ngrok (https://ngrok.com/download), then run
`ngrok http 8000` and open the `https://…ngrok-free.app` link on the phone.
The camera only works over https, which ngrok gives you.

Or just double-click `start.bat` (Windows) / run `./start.sh` (Mac/Linux) after setup.

---

### Optional: play the landing video offline
The landing page streams its background video from the internet. To keep it working on bad venue Wi-Fi, download it once:
```bash
mkdir -p frontend/public/media && curl -L -o frontend/public/media/hero.mp4 https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/hero-bg-glass-ball-1_5mb.mp4
```
Then run `./start.sh` again. If the video can't load at all, the page shows the animated vortex instead.

---

### Optional: your own photos on the "damage" cards
The landing page cards load photos from Wikimedia Commons. To use your own (or work offline), save JPGs here with these exact names and rebuild:
`frontend/public/media/effects/` → `marine-life.jpg`, `microplastics.jpg`, `land.jpg`, `drains.jpg`, `burning.jpg`, `centuries.jpg`.
A local file always wins; if a photo can't load, the card shows a designed fallback instead of a broken image.

---

## 3. Check it is working

1. Open http://localhost:8000/api/health. You should see `"yolo": true` and/or `"gemini": true`.
2. The bottom-left of the app shows which engines are loaded (green dot = ready).
3. Scan a photo with a bottle, a banana and a phone in it. All three should be boxed.

No model available yet? Set `DETECTOR=demo` in `.env` to test the UI with sample results.
**Turn it back to `auto` before judging.**

---

## 4. Make detection better (optional, high impact)

The default YOLO model (COCO) knows bottles, cups, fruit, phones, laptops and similar items.
For real litter (cans, wrappers, cardboard, cigarette butts):

1. Go to https://universe.roboflow.com and search **"TACO"** or **"litter detection"**.
2. Pick a YOLOv8 model, then **Download dataset → YOLOv8** and train on Google Colab
   (free GPU, about 30 min), or download pre-trained weights if offered.
3. Save the weights as `backend/weights/best.pt` and restart. It is picked up automatically.
4. Add any new class names to `LABELS` in `backend/categories.py`.

Gemini already catches most items YOLO misses, so this step is a bonus, not a blocker.

---

## 5. Demo script (90 seconds)

1. **Login page.** Let the vortex animation play for a second. It sets the tone.
2. **Scan.** Put a messy pile on the table: plastic bottle with cap on, AA battery,
   banana peel, newspaper, a can. Take one photo.
   - Boxes appear on every item.
   - Red hazard alert for the battery.
   - "Cap on" flagged on the bottle.
3. **Digital twin.** Show the flow chart growing. Drag *households that segregate*
   from 20% to 80% and watch landfill drop and money saved rise.
4. **AI coach.** Switch to ಕನ್ನಡ, press the speaker icon on a tip.
5. Close with: *"We don't just classify waste. We track where it goes and what it's worth."*

**Always have a backup:** record a screen video of this flow the night before.

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach the server" | Backend is not running. Start uvicorn on port 8000. |
| Engine says "No model loaded" | Add `GEMINI_API_KEY` to `.env`, or install `ultralytics`. Restart. |
| Camera button opens the gallery | Normal on desktop. On a phone, use the https ngrok link. |
| Gemini error / slow | Venue Wi-Fi. YOLO results still show. Try a phone hotspot. |
| `yolov8n.pt` download fails | Needs internet once. Or copy the file into `backend/`. |
| Changed frontend but demo mode shows old UI | Run `npm run build` again. |

---

## 7. Project map

See `CLAUDE.md` for the architecture, API list and conventions. Claude Code reads it automatically.
