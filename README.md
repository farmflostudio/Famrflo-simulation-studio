# FarmFlo Simulation Studio

A smart irrigation scheduling platform for virtual UK farms. A user describes a farm, the system builds a realistic environment for it, predicts soil moisture with machine learning, and shows the results on a live dashboard.

The project has three parts, plus one shared folder:

- `frontend` - React dashboard
- `backend` - Node and Express API, MongoDB
- `python-training` - data pipeline, simulation engine, model training, and the inference service the backend calls
- `models` - the trained, ready to use prediction models, already committed, no retraining required

## Prerequisites

- Node.js 20 or later
- Python 3.11
- A MongoDB connection string (Atlas or self hosted)

## One time setup

**1. Backend environment file**

```
cd backend
copy .env.example .env
```

Open `backend/.env` and fill in:

- `MONGODB_URI` and `MONGODB_DB_NAME` - your database
- `JWT_SECRET` - any long random string
- `GEMINI_API_KEY` - only needed for the language layer added in Part Two
- `SIMULATION_SERVICE_URL` - leave as `http://localhost:8000`

**2. Install each part**

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

1. Go to `http://localhost:5173`, you'll land on the sign in screen.
2. Follow the link to create an account.
3. You'll be dropped on an empty dashboard, follow "Set up a farm".
4. Enter a real UK latitude and longitude (for example `52.2053, 0.1218` for Cambridge), a soil type, and a land cover.
5. Back on the dashboard, the app runs a real simulation and a real prediction for that farm automatically and charts the result.

## Checking the models without running the app

```
cd python-training
.venv\Scripts\activate
python src/models/predict_sample.py
```

Loads all three committed models and prints a prediction from each against a real saved example, no training or network access required.

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
