# FarmFlo Simulation Studio

A smart irrigation scheduling platform for virtual UK farms. A user describes a farm, the system builds a realistic environment for it, predicts soil moisture with machine learning, plans irrigation with an optimisation based decision engine, and explains the plan in plain language.

The project has three parts, plus one shared folder:

- `frontend` - React dashboard
- `backend` - Node and Express API, MongoDB
- `python-training` - data pipeline, simulation engine, model training, and the inference service the backend calls
- `models` - the trained, ready to use prediction models, already committed, no retraining required

## Prerequisites

- Node.js 20 or later
- Python 3.11
- A MongoDB connection string (Atlas or self hosted)
- A Gemini API key (for the language layer - farm description parsing and schedule explanations)

## One time setup

**1. Backend environment file**

```
cd backend
copy .env.example .env
```

Open `backend/.env` and fill in:

- `MONGODB_URI` and `MONGODB_DB_NAME` - your database
- `JWT_SECRET` - any long random string
- `GEMINI_API_KEY` - your Gemini API key
- `SIMULATION_SERVICE_URL` - leave as `http://localhost:8000`

**2. Python service environment file**

```
cd python-training
copy .env.example .env
```

Open `python-training/.env` and set `GEMINI_API_KEY` to the same value you used in `backend/.env`. This is a separate file because the language layer (Google ADK and Gemini) runs inside the Python service, not the Node backend - the two never share a config file, so the key is copied once during setup rather than passed over the network on every request.

**3. Install each part**

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

Only run `python -m venv .venv` if the `python-training\.venv` folder doesn't already exist, it's a one time step. Run it from a plain terminal, not one where a venv is already active (the prompt won't start with `(.venv)`), otherwise Windows can't overwrite the interpreter it's currently running. If `.venv` already exists, skip straight to `.venv\Scripts\activate`.

## Running the app

Three things need to run at the same time, each in its own terminal.

**Terminal 1, the simulation and prediction service**

```
cd python-training
.venv\Scripts\activate
uvicorn service.main:app --port 8000
```

Wait for `Application startup complete`. This loads the three trained models plus the calibrated soil data, so it takes a few seconds.

**Terminal 2, the backend API**

```
cd backend
npm run dev
```

Confirms with `Connected to MongoDB` and `API listening on port 5000`.

**Terminal 3, the frontend**

```
cd frontend
npm run dev
```

Open the printed address, normally `http://localhost:5173`.

## First run

1. Go to `http://localhost:5173`, you'll land on the public landing page.
2. Select "Get started" to create an account, or "Sign in" if you already have one.
3. You'll be dropped on an empty dashboard, follow "Add farm".
4. Enter a real UK latitude and longitude (for example `52.2053, 0.1218` for Cambridge), a soil type, and a land cover. You can also type a plain language description first and select "Auto-fill from description" to have the language layer suggest the soil type, land cover, name, and location label for you - review the suggestion before creating the farm.
5. Back on the dashboard, the app runs a real simulation and a real prediction for that farm automatically and charts the result.
6. Open "Schedule" from the navigation bar, choose the farm and a planning horizon, and select "Generate schedule". This runs the optimisation based decision engine and the three comparison baselines (fixed interval, threshold based, linear programme) side by side, and asks the language layer for a plain language explanation of the recommended plan. If the explanation doesn't pass the guardrail check against the real numbers (or the language layer is unreachable), a plain template sentence is shown instead - built directly from the same numbers, so the schedule itself is never blocked by the language layer.
7. Open "History" to see past farms, simulations, predictions, and schedules for your account.

## Checking the models without running the app

```
cd python-training
.venv\Scripts\activate
python src/models/predict_sample.py
```

Loads all three committed models and prints a prediction from each against a real saved example, no training or network access required.

This is different from generating a schedule through the running app: a schedule needs live internet access, since it calls the Open-Meteo forecast API for the next few days of weather and the Gemini API for the plain language explanation. If either is unreachable, the schedule numbers are still computed and returned - only the explanation falls back to a template sentence.

## Running tests

**Backend** (unit and integration tests, in-memory MongoDB, no real network calls)

```
cd backend
npm test
```

**Python** (model loading, decision engine, and language layer guardrail)

```
cd python-training
.venv\Scripts\activate
pytest
```

## Regenerating the data and retraining (optional)

The committed models in `models/` are ready to use as they are. These steps are only needed if you want to rebuild the pipeline from scratch:

```
cd python-training
.venv\Scripts\activate

python src/data_access/build_dataset.py
python src/simulation/calibrate.py
python src/simulation/generate_synthetic.py
python src/models/compare.py
```

Each step caches its output under `python-training/data/cache`, which is not committed since it can always be rebuilt from the scripts above.
