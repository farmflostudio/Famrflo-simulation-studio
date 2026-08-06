import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent))

from model_store import get_store
from prediction import predict as run_predict
from simulation import run_simulation

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
