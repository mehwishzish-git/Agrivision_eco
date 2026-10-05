# AgriVision AI

> **Agricultural Intelligence Platform** — Monitor crops, analyze soil health, detect diseases, and get AI-powered farm recommendations.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ 
- Node.js 18+

### Install Dependencies

```bash
# Backend
cd backend
pip install flask flask-cors pillow numpy

# Frontend
cd frontend
npm install
```

### Start the Application

**Option 1: Run the startup script (Windows)**
```powershell
.\start.ps1
```

**Option 2: Manual startup**

Terminal 1 – Backend:
```bash
cd backend
python app.py
```

Terminal 2 – Frontend:
```bash
cd frontend
npm run dev
```

**Open:** [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
Agrivision/
├── backend/
│   ├── app.py          # Flask REST API
│   ├── database.py     # SQLite schema + demo seed data
│   ├── ai_engine.py    # Rule-based AI/ML engine
│   └── uploads/        # Uploaded crop images
├── frontend/
│   ├── src/
│   │   ├── pages/      # All page components
│   │   ├── components/ # Sidebar, TopHeader
│   │   ├── context/    # FarmContext (global state)
│   │   ├── api.js      # Axios API client
│   │   └── index.css   # Design system
│   └── ...
├── start.ps1           # Windows startup script
└── README.md
```

---

## 🌾 Features

| Feature | Status |
|---|---|
| Dashboard with farm overview | ✅ |
| Farm Zones management | ✅ |
| Weather data & trends | ✅ |
| Soil nutrient analysis | ✅ |
| Crop image analysis (demo AI) | ✅ |
| Farm health scoring | ✅ |
| Risk assessment | ✅ |
| AI-powered recommendations | ✅ |
| What-if scenario simulation | ✅ |
| AI chat assistant | ✅ |
| Demo farm with realistic data | ✅ |

---

## 🤖 AI Model Note

This MVP uses a **rule-based demo engine** — not a real ML model. It is clearly labeled throughout the UI. The architecture is designed to replace the rule-based engine with real models (CNNs for image analysis, LLMs for the assistant) without changing the API or frontend.

---

## ⚠️ Safety & Disclaimers

- All disease detections are labeled with confidence levels
- Low-confidence results always recommend field verification
- No unsafe chemical dosage instructions are provided
- Simulations are clearly labeled as estimates, not predictions
- The AI assistant only uses actual database values — it never fabricates data
- Demo/simulated data is always labeled as such

---

## 🛠️ API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/farms` | List farms |
| GET | `/api/farms/:id/dashboard` | Dashboard data |
| GET | `/api/farms/:id/zones` | List zones |
| POST | `/api/zones/:id/analyze` | Run crop analysis |
| GET | `/api/farms/:id/health` | Health scores |
| GET | `/api/farms/:id/recommendations` | Recommendations |
| POST | `/api/zones/:id/simulate` | Run simulation |
| POST | `/api/farms/:id/assistant` | AI assistant chat |

Full API documentation available via `/api/health`.
