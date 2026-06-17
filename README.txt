═══════════════════════════════════════════════════════════
  🍊  MISE AI — SETUP GUIDE
  Powered by Google Gemini Vision API (FREE)
═══════════════════════════════════════════════════════════

STEP 1 — GET YOUR FREE GEMINI API KEY
──────────────────────────────────────
1. Go to:  https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with "AIza...")

Free tier: 15 req/min · 1,500 req/day · No credit card needed


STEP 2 — ADD YOUR API KEY
───────────────────────────
Open server.py and find:

  GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'YOUR_KEY_HERE')

Replace  YOUR_KEY_HERE  with your actual key:

  GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyXXXXXXXXX')

OR set it safely as an environment variable (recommended):

  Mac/Linux:  export GEMINI_API_KEY=AIzaSyXXXXXXXXX
  Windows:    set    GEMINI_API_KEY=AIzaSyXXXXXXXXX


STEP 3 — INSTALL DEPENDENCIES
───────────────────────────────
  pip install -r requirements.txt

  (or individually):
  pip install flask flask-cors google-generativeai Pillow


STEP 4 — FILE STRUCTURE
────────────────────────
All files must be in the SAME folder:

  mise-ai/
  ├── server.py                ← Python backend (fixed)
  ├── requirements.txt
  ├── mise_ai_vision.html      ← Food scanner (fixed)
  ├── mise_ai.html             ← Voice chat
  ├── kitchen.html             ← Meal planner
  ├── inventory.html           ← Inventory
  ├── inventory.css
  ├── inventory.js
  ├── inventory_patch.js
  └── mise_ai_logo.png


STEP 5 — RUN THE SERVER
────────────────────────
  python server.py

You should see:
  ════════════════════════════════════════════════════
    🍊  Mise AI Vision Server  (Gemini Edition)
  ════════════════════════════════════════════════════
    URL:      http://localhost:5000
    Model:    gemini-1.5-flash (free tier)
    API Key:  SET ✓
  ════════════════════════════════════════════════════


STEP 6 — OPEN IN BROWSER
──────────────────────────
Go to:  http://localhost:5000

Then:
  • Click "Enable Camera" to use your webcam
  • OR click "Upload" to analyse any food photo
  • Press the orange scan button (or SPACE/ENTER) to scan
  • Results appear in the Analysis tab
  • Recipe auto-populates in the Recipe tab
  • Scans are saved in History


BUGS FIXED IN THIS VERSION
────────────────────────────
server.py:
  ✓ /chat endpoint — broken Gemini history construction rewritten
  ✓ /chat endpoint — consecutive same-role messages now merged correctly
  ✓ /chat endpoint — system instruction now uses Gemini's proper parameter
  ✓ /chat endpoint — NameError on empty messages list fixed
  ✓ API key check — consistent placeholder across code and README

mise_ai_vision.html:
  ✓ captureFrame() — null guard prevents sending 0×0 canvas to API
  ✓ doScan() — video readyState checked before capture
  ✓ runAnalysis() — handles null frame gracefully with user toast
  ✓ Comment fixed: was "CLAUDE VISION API", now "GEMINI VISION API"


TROUBLESHOOTING
────────────────
"Server not running" toast:
  → Run  python server.py  in your terminal

"GEMINI_API_KEY not set":
  → Open server.py, replace YOUR_KEY_HERE with your real key

Camera not working:
  → Allow camera permission in browser
  → Must run on http://localhost (not file://)

Port 5000 already in use:
  → Change last line of server.py: app.run(port=5001)
  → Then open http://localhost:5001

pip not found:
  → Try  pip3  instead of  pip

ModuleNotFoundError:
  → Run  pip install flask flask-cors google-generativeai Pillow


API ENDPOINTS
──────────────
GET  /           → serves mise_ai_vision.html
GET  /<file>     → serves any static file
POST /analyze    → food image recognition (Gemini Vision)
POST /chat       → culinary assistant chat (Gemini)
GET  /health     → server status

═══════════════════════════════════════════════════════════
