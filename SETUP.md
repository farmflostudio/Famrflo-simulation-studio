# FarmFlo Simulation Studio — Full Setup Guide

This guide walks through everything needed to get FarmFlo running from a fresh clone: accounts and credentials, installing each part, running the three services, a first-use walkthrough, running the test suites, and troubleshooting the issues that actually come up on Windows.

For a shorter version of this, see `README.md`. This document goes further and assumes nothing.

## 1. What the project is made of

Four folders, three of which are separate services you run at the same time, plus one shared folder of committed model files:

| Folder | What it is | Runs on |
|---|---|---|
| `frontend` | React + Vite dashboard | `http://localhost:5173` |
| `backend` | Node/Express API, MongoDB, JWT auth | `http://localhost:5000` |
| `python-training` | Data pipeline, simulation engine, model training, and the FastAPI inference/decision/language service the backend calls | `http://localhost:8000` |
| `models` | Trained Random Forest, XGBoost, and LSTM model files, already committed — no retraining needed to run the app | — |

The frontend talks only to the backend. The backend talks to MongoDB and to the Python service. Nothing calls the Python service directly except the backend.

## 2. What you'll need

**Software:**
- Node.js 20 or later (`node --version`)
- Python 3.11 (`python --version`)
- Git

**Accounts and credentials:**
- A MongoDB connection string — either [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier is enough) or a self-hosted instance
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/) — powers the language layer (turning a farm description into structured fields, and explaining a finished irrigation schedule in plain language)

Neither credential is committed anywhere in the repository. You provide both yourself in local `.env` files that are gitignored.

### Getting a MongoDB connection string

1. Create a free cluster at MongoDB Atlas (or use a self-hosted MongoDB).
2. Create a database user with a password.
3. Under Network Access, allow your current IP (or `0.0.0.0/0` for local development only).
4. Copy the connection string from the Atlas "Connect" dialog — it looks like `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/`.
5. Pick a database name (anything you like, e.g. `farmflo`) — this is set separately, not part of the URI.

### Getting a Gemini API key

1. Go to Google AI Studio and create an API key.
2. Copy it somewhere safe — you'll paste it into two files in the next step.

## 3. Clone and configure environment files

```
git clone <this repository's URL>
cd "FarmFlo Simulation study"
```

**Backend environment file:**

```
cd backend
copy .env.example .env
```

Open `backend/.env` and fill in every value:

```
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb+srv://...           # from step 2
MONGODB_DB_NAME=farmflo                 # any name you like

JWT_SECRET=                             # any long random string
JWT_EXPIRES_IN=1d

GEMINI_API_KEY=                         # from step 2

SIMULATION_SERVICE_URL=http://localhost:8000
```

A long random string for `JWT_SECRET` can be generated with:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Python service environment file:**

```
cd ../python-training
copy .env.example .env
```

Open `python-training/.env` and set:

```
GEMINI_API_KEY=                         # the same value as backend/.env
```

This is a second, separate file because the language layer (Google's Agent Development Kit and Gemini) runs inside the Python service, not the Node backend. The two processes never share a config file, so the same key is copied into both once during setup.

**Frontend:** no environment file needed. The Vite dev server proxies `/api` requests straight to the backend (see `frontend/vite.config.js`).

## 4. Install dependencies

```
cd backend
npm install

cd ../frontend
npm install

cd ../python-training
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Only run `python -m venv .venv` once — skip it if `python-training\.venv` already exists. Run it from a plain terminal, not one where a venv is already active (the prompt shouldn't start with `(.venv)`), otherwise Windows can't overwrite the Python interpreter it's currently running from. See the troubleshooting section below if this happens.

## 5. Verify your environment before running anything

```
cd backend
npm run check-env
```

This prints each required variable (masked) and fails loudly if anything is missing, before you spend time chasing a confusing runtime error later.

## 6. Run the app

Three terminals, all at the same time.

**Terminal 1 — the simulation, prediction, decision engine, and language service**

```
cd python-training
.venv\Scripts\activate
uvicorn service.main:app --port 8000
```

Wait for `Application startup complete`. This loads the three trained models plus the calibrated soil data, so it takes a few seconds. TensorFlow may print warnings about GPU support on Windows — this is expected and harmless, the app runs on CPU.

**Terminal 2 — the backend API**

```
cd backend
npm run dev
```

Confirms with `Connected to MongoDB` and `API listening on port 5000`.

**Terminal 3 — the frontend**

```
cd frontend
npm run dev
```

Open the printed address, normally `http://localhost:5173`.

## 7. First walkthrough

1. Go to `http://localhost:5173` — you land on the public landing page.
2. Select "Get started" to create an account (or "Sign in" if you already have one).
3. You're dropped on an empty dashboard — select "Add farm".
4. Either fill in the fields manually, or type a plain language description first (e.g. "A 20 hectare arable wheat farm near Norwich on heavy clay soil") and select "Auto-fill from description" — the language layer suggests a soil type, land cover, name, and location label. Review the suggestion before creating the farm; it never submits on its own.
5. Enter a real UK latitude and longitude (`52.2053, 0.1218` for Cambridge is a good test value), a soil type, and a land cover.
6. Back on the dashboard, the app runs a real simulation and a real prediction for that farm automatically and charts the result, comparing all three trained models.
7. Open "Schedule" from the navigation bar, choose the farm and a planning horizon (3, 7, or 14 days), and select "Generate schedule". This runs the optimisation based decision engine and the three comparison baselines (fixed interval, threshold based, linear programme) side by side, and asks the language layer for a plain language explanation of the recommended plan.
   - If the explanation doesn't pass the guardrail check against the real numbers, or the language layer is unreachable, a plain template sentence is shown instead — built directly from the same numbers. The schedule's numeric plan is never blocked by the language layer failing.
8. Open "History" to see past farms, simulations, predictions, and schedules for your account.

## 8. Running the test suites

**Backend** — unit and integration tests, an in-memory MongoDB instance, no real network calls:

```
cd backend
npm test
```

**Python** — model loading, decision engine, and language layer guardrail:

```
cd python-training
.venv\Scripts\activate
pytest
```

Neither suite calls the real Gemini API, Open-Meteo, or MongoDB Atlas — they're safe to run offline and repeatedly.

## 9. Checking the models without running the whole app

```
cd python-training
.venv\Scripts\activate
python src/models/predict_sample.py
```

Loads all three committed models and prints a prediction from each against a real saved example — no training, no network access, no other services required.

This is different from generating a schedule through the running app: a schedule needs live internet access, since it calls the Open-Meteo forecast API for the next few days of weather and the Gemini API for the plain language explanation.

## 10. Regenerating the data and retraining (optional)

The committed models in `models/` are ready to use as they are — these steps are only needed to rebuild the pipeline from scratch:

```
cd python-training
.venv\Scripts\activate

python src/data_access/build_dataset.py
python src/simulation/calibrate.py
python src/simulation/generate_synthetic.py
python src/models/compare.py
```

Each step caches its output under `python-training/data/cache`, which is not committed since it can always be rebuilt from the scripts above.

## 11. Troubleshooting

**`Fatal error in launcher` when running `pip` inside the venv**
The `.venv` folder was created at a different path and then moved (e.g. from OneDrive to a plain drive). The compiled `pip.exe`/`pip3.exe` launcher stubs have the old path baked in. Fix:
```
.venv\Scripts\python.exe -m pip install --upgrade --force-reinstall --no-deps pip
```
If other console-script `.exe` files in `.venv\Scripts` show the same error after being reinstalled before the move, reinstall that specific package the same way (`python.exe -m pip install --force-reinstall --no-deps <package>`).

**`Error: [Errno 13] Permission denied` when running `python -m venv .venv`**
You're running this from inside the very venv you're trying to recreate (prompt starts with `(.venv)`). Windows won't let a running process overwrite its own executable. Deactivate first (`deactivate`), or open a fresh terminal, then recreate it using the base Python install, not `.venv\Scripts\python.exe`.

**`Application startup complete` never appears / the Python service seems to hang on startup**
It's loading TensorFlow and the LSTM model, which is genuinely slow the first time (10–20 seconds is normal). If it truly never completes, check the terminal for a Python traceback — the most common cause is a missing or corrupted file under `models/`.

**Port already in use (5173, 5000, or 8000)**
Something else (often a leftover process from a previous run) is already bound to that port. On Windows:
```
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

**`npm test` in `backend` throws an `EBADENGINE` warning**
This is a warning, not a failure — `vitest`'s `vite` peer dependency asks for a slightly newer Node than the documented minimum. It's safe to ignore as long as the tests actually pass; if they don't, update Node.

**A schedule takes a long time to generate, or the explanation is missing**
The numeric plan requires a live call to the Open-Meteo forecast API; the explanation additionally requires a live call to Gemini. If your network is slow or either service is temporarily down, the plan still returns — only the explanation degrades to a template sentence. This is expected behavior, not a bug.

**`GEMINI_API_KEY` errors from the Python service specifically**
Check `python-training/.env` exists and has the key set — it's separate from `backend/.env`, and both need the same value. Restart `uvicorn` after editing it; it only reads the file at startup.

## 12. Project structure at a glance

```
backend/
  src/
    controllers/   # one file per resource (farms, schedules, history, language, ...)
    routes/         # Express routers, validation rules, rate limits
    models/         # Mongoose schemas
    services/       # HTTP clients to the Python service
    middleware/      # auth, request validation
  tests/            # Vitest + Supertest, in-memory MongoDB

frontend/
  src/
    pages/          # one file per screen (Landing, Dashboard, Schedule, History, ...)
    components/     # shared UI pieces (charts, tables, cards)
    lib/             # API client, chart theme, date helpers

python-training/
  service/          # the FastAPI app: prediction, simulation, decision engine, language layer
  src/
    data_access/    # COSMOS UK, NASA POWER, Open-Meteo fetch/cache scripts
    simulation/      # the water balance model and calibration
    models/          # training scripts and the offline prediction check
  tests/            # pytest suite

models/              # committed, ready to use trained model files
```
