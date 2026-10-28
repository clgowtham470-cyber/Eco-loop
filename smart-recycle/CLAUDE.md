# EcoLoop — Smart Recycling Assistant (hackathon project)

Problem statement 06: a computer-vision system that recognises recyclable, reusable,
biodegradable and hazardous materials, a Digital Twin that tracks material flow, and
Generative AI that gives personalised recommendations for a circular economy.

Solo builder, 2-day hackathon. **The live demo must never crash.** Prefer small, safe
changes; keep every feature working end-to-end after each change.

## Run it

```bash
# backend (terminal 1)
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then put GEMINI_API_KEY in it
uvicorn main:app --reload --port 8000

# frontend (terminal 2)
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :8000)
```

Single-port demo (for ngrok / phone camera): `cd frontend && npm run build`, then
only run the backend; it serves `frontend/dist` at http://localhost:8000.
Then `ngrok http 8000` gives an https URL that works on phones (camera needs https).

UI testing without any model: set `DETECTOR=demo` in `backend/.env` (fake detections,
clearly labelled "Demo" in the UI). Never present demo mode to judges as real.

## Architecture

```
frontend (React + Vite + framer-motion + recharts)
  pages/Login     vortex canvas + vortex text, login/register
  pages/Overview  impact band, category chart, recent scans
  pages/Scan      upload/camera -> compress -> /api/detect -> SVG boxes + item list
  pages/Twin      Sankey of material flow + what-if simulator (/api/simulate)
  pages/Coach     Gemini recommendations + chat, 5 Indian languages, text-to-speech
  pages/History   past scans
  components/VortexText, VortexCanvas, Layout, Logo, CountUp
backend (FastAPI, SQLite)
  main.py        routes, auth (token in Authorization: Bearer), serves dist/
  detector.py    YOLO (local) + Gemini Vision (cloud) merged by IoU; graceful fallbacks
  categories.py  label -> category, material, weight, disposal instruction, Rs/kg, CO2
  twin.py        routes items through bin -> facility -> outcome; Sankey + simulate + stats
  genai.py       recommend() and coach(), grounded on user stats + KNOWLEDGE (Indian rules)
  db.py          users, sessions, scans, items
```

### API
- `POST /api/auth/register|login|logout`, `GET /api/me`
- `POST /api/detect` (multipart `file`) -> `{width,height,items[],summary,source,notes}`
- `GET /api/twin?scope=me|all` -> `{nodes,links,kpis,assumptions}` (Recharts Sankey format)
- `POST /api/simulate` `{households,days,segregation_pct,contamination_pct}`
- `GET /api/stats`, `GET /api/history`
- `POST /api/recommend` `{lang}`, `POST /api/coach` `{question,history,lang}`
- `GET /api/health` -> which detectors are loaded

### Detection logic (detector.py)
1. YOLO runs first. With default `yolov8n.pt` (COCO) only waste-relevant labels in
   `categories.LABELS` are kept. With a custom `backend/weights/best.pt`, all labels kept.
2. Gemini returns JSON items with `box_2d` (0-1000, ymin,xmin,ymax,xmax), category,
   material, condition, instruction.
3. Merge: Gemini enriches YOLO boxes with IoU > 0.3; Gemini-only items are added;
   low-confidence YOLO hits Gemini did not confirm are dropped.
4. `categories.enrich()` fills weight, Rs value (30% if dirty), CO2.
If Gemini fails, YOLO results still return (with a note). Never let /detect 500 on a cloud error.

## Conventions
- Categories are exactly: `recyclable | reusable | biodegradable | hazardous`.
  Colours: #2563EB, #7C3AED, #16A34A, #DC2626 (frontend `CATS` in src/api.js).
- Design tokens are CSS variables at the top of `frontend/src/styles.css`
  (abyss #062925, loop #0E7C6B, mist #EEF3F1; fonts Unbounded + Manrope). Reuse them.
- Plain CSS, no Tailwind. Animations with framer-motion; respect reduced motion.
- Copy is sentence case, plain verbs, no emojis in UI.
- Numbers in twin.py `ASSUMPTIONS` are demo estimates and are shown openly in the UI.

## Good next improvements (in priority order)
1. Train/download a litter model (Roboflow Universe, TACO dataset) -> `backend/weights/best.pt`
   and add its class names to `categories.LABELS`.
2. Live camera mode (getUserMedia, scan every 2 s) on the Scan page.
3. "Correct this item" button that stores user labels (active learning story).
4. Nearest drop-off points map for hazardous items.
5. Leaderboard / points for "All users" scope.
