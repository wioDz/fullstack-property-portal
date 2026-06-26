"""
Python backend for Property Value Estimator (App 1).
Forwards requests to ML Service with all 7 features.
"""

import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List

import httpx
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


ML_SERVICE_URL = os.environ.get("ML_SERVICE_URL", "http://localhost:8001")


class HouseFeatures(BaseModel):
    """Input features for a property."""

    square_footage: float = Field(..., gt=0, description="Living area in square feet")
    bedrooms: float = Field(..., ge=0, description="Number of bedrooms")
    bathrooms: float = Field(..., ge=0, description="Number of bathrooms")
    year_built: int = Field(..., ge=1800, le=2100, description="Year built")
    lot_size: float = Field(..., gt=0, description="Lot size in square feet")
    distance_to_city_center: float = Field(..., ge=0, description="Miles to city center")
    school_rating: float = Field(..., ge=0, le=10, description="School rating 0-10")


class PredictionRecord(BaseModel):
    id: int
    features: HouseFeatures
    predicted_price: float
    created_at: str


class SinglePredictionRequest(HouseFeatures):
    pass


class SinglePredictionResponse(BaseModel):
    predicted_price: float
    record: PredictionRecord


class BatchPredictionRequest(BaseModel):
    items: List[HouseFeatures] = Field(..., min_length=1, max_length=1000)


class BatchPredictionResponse(BaseModel):
    predictions: List[float]


class HistoryResponse(BaseModel):
    history: List[PredictionRecord]
    count: int


class CompareRequest(BaseModel):
    items: List[HouseFeatures] = Field(..., min_length=2, max_length=10)


class CompareResponse(BaseModel):
    results: List[dict]


class HealthResponse(BaseModel):
    status: str
    ml_service_reachable: bool
    uptime_seconds: float
    ml_service_response_time_ms: float | None = None


class HistoryStore:
    def __init__(self):
        self._records: List[PredictionRecord] = []
        self._next_id = 1

    def add(self, features: HouseFeatures, predicted_price: float) -> PredictionRecord:
        record = PredictionRecord(
            id=self._next_id,
            features=features,
            predicted_price=predicted_price,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self._records.append(record)
        self._next_id += 1
        return record

    def list_all(self) -> List[PredictionRecord]:
        return list(reversed(self._records))


history_store = HistoryStore()
# Monotonic clock keeps uptime stable even if the host clock is adjusted.
START_TIME = time.monotonic()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(
        base_url=ML_SERVICE_URL, timeout=30.0, trust_env=False
    )
    yield
    await app.state.http_client.aclose()


app = FastAPI(
    title="Property Value Estimator API",
    description="Python backend for property value estimation with 7 features.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _features_to_dict(features: HouseFeatures) -> dict:
    return features.model_dump()


async def _call_ml_predict(client: httpx.AsyncClient, features: HouseFeatures) -> float:
    response = await client.post("/predict", json=_features_to_dict(features))
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ML service error: {response.text}",
        )
    return response.json()["predicted_price"]


async def _call_ml_predict_batch(
    client: httpx.AsyncClient, items: List[HouseFeatures]
) -> List[float]:
    payload = {"items": [_features_to_dict(item) for item in items]}
    response = await client.post("/predict/batch", json=payload)
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ML service error: {response.text}",
        )
    return response.json()["predictions"]


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    ml_response_time_ms = None
    try:
        async with httpx.AsyncClient(trust_env=False) as client:
            # Report downstream latency so callers can see how long health waited
            # for the ML service to respond.
            start = time.monotonic()
            resp = await client.get(f"{ML_SERVICE_URL}/health", timeout=5.0)
            ml_response_time_ms = round((time.monotonic() - start) * 1000, 2)
        ml_reachable = resp.status_code == status.HTTP_200_OK
    except Exception:
        ml_reachable = False

    return HealthResponse(
        status="healthy",
        ml_service_reachable=ml_reachable,
        uptime_seconds=round(time.monotonic() - START_TIME, 3),
        ml_service_response_time_ms=ml_response_time_ms,
    )


@app.post(
    "/api/v1/predictions",
    response_model=SinglePredictionResponse,
    tags=["Predictions"],
)
async def create_prediction(request: SinglePredictionRequest):
    client: httpx.AsyncClient = app.state.http_client
    predicted_price = await _call_ml_predict(client, request)
    record = history_store.add(request, predicted_price)

    return SinglePredictionResponse(
        predicted_price=predicted_price,
        record=record,
    )


@app.get(
    "/api/v1/predictions/history",
    response_model=HistoryResponse,
    tags=["Predictions"],
)
async def get_history():
    history = history_store.list_all()
    return HistoryResponse(history=history, count=len(history))


@app.post(
    "/api/v1/predictions/compare",
    response_model=CompareResponse,
    tags=["Predictions"],
)
async def compare_predictions(request: CompareRequest):
    client: httpx.AsyncClient = app.state.http_client
    predictions = await _call_ml_predict_batch(client, request.items)

    results = []
    for features, price in zip(request.items, predictions):
        results.append({
            "features": _features_to_dict(features),
            "predicted_price": price,
        })

    return CompareResponse(results=results)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
