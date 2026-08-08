import os
import sys
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent))

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
os.environ.setdefault("GOOGLE_API_KEY", os.getenv("GEMINI_API_KEY", ""))

from model_store import get_store
from prediction import predict as run_predict
from simulation import run_simulation
from decision_engine import DEFAULT_HORIZON_DAYS, build_schedule
from language_layer import explain_schedule, suggest_farm_config

app = FastAPI(title="FarmFlo Simulation Service")


@app.on_event("startup")
def load_models():
    get_store()


class SimulateRequest(BaseModel):
    latitude: float
    longitude: float
    startDate: str
    endDate: str
    soilType: Optional[str] = None
    initialVwc: Optional[float] = None


class PredictRequest(BaseModel):
    latitude: float
    longitude: float
    soilType: Optional[str] = None
    landCover: Optional[str] = None
    targetDate: Optional[str] = None


class ScheduleRequest(BaseModel):
    latitude: float
    longitude: float
    soilType: Optional[str] = None
    landCover: Optional[str] = None
    horizonDays: Optional[int] = DEFAULT_HORIZON_DAYS


class ConfigureRequest(BaseModel):
    description: str


class ExplainRequest(BaseModel):
    farmName: Optional[str] = None
    referenceSite: Optional[str] = None
    horizonDays: int
    totalWaterMm: float
    irrigationDays: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/simulate")
def simulate(payload: SimulateRequest):
    try:
        return run_simulation(
            payload.latitude,
            payload.longitude,
            payload.startDate,
            payload.endDate,
            soil_type=payload.soilType,
            initial_vwc=payload.initialVwc,
        )
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err))


@app.post("/predict")
def predict(payload: PredictRequest):
    try:
        return run_predict(
            payload.latitude,
            payload.longitude,
            payload.soilType,
            payload.landCover,
            target_date=payload.targetDate,
        )
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err))


@app.post("/schedule")
def schedule(payload: ScheduleRequest):
    horizon_days = payload.horizonDays or DEFAULT_HORIZON_DAYS
    if not 1 <= horizon_days <= 14:
        raise HTTPException(status_code=422, detail="horizonDays must be between 1 and 14")

    try:
        return build_schedule(
            payload.latitude,
            payload.longitude,
            soil_type=payload.soilType,
            land_cover=payload.landCover,
            horizon_days=horizon_days,
        )
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err))


@app.post("/configure")
def configure(payload: ConfigureRequest):
    try:
        return suggest_farm_config(payload.description)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err))
    except Exception:
        raise HTTPException(status_code=502, detail="The language model is unavailable")


@app.post("/explain")
def explain(payload: ExplainRequest):
    numbers = {
        "horizonDays": payload.horizonDays,
        "totalWaterMm": payload.totalWaterMm,
        "irrigationDays": payload.irrigationDays,
    }
    return explain_schedule(payload.farmName, payload.referenceSite, numbers)
