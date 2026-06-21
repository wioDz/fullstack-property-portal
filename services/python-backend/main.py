"""
Python backend for the Property Value Estimator application (App 1).

This service acts as a thin orchestration layer between the Next.js portal
and the ML model service. It validates incoming requests, forwards them to
ml-service, and keeps a lightweight in-memory history of predictions for the
demo history/comparison features.

Why this layer exists:
- It isolates the portal from the ML service's URL structure and response shapes.
- It adds an in-memory history store so users can view and compare past estimates.
- It provides a stable API contract (the /api/v1 paths below) that the portal
  and Next.js API routes can rely on even if the ML service changes.

Endpoints:
  GET  /health                     - health check
  POST /api/v1/predictions         - single prediction
  GET  /api/v1/predictions/history - list previous predictions
  POST /api/v1/predictions/compare - batch comparison of multiple properties
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List

import httpx
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# URL of the ML service. In Docker Compose this is the service name; locally
# it defaults to localhost.
ML_SERVICE_URL = os.environ.get("ML_SERVICE_URL", "http://localhost:8001")

# Feature names expected by the ML service. The order must be preserved when
# calling the batch endpoint.
FEATURE_NAMES = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class HouseFeatures(BaseModel):
    """Input features for a property."""

    square_footage: float = Field(..., gt=0)
    bedrooms: float = Field(..., ge=0)
    bathrooms: float = Field(..., ge=0)
    year_built: int = Field(..., ge=1800, le=2100)
    lot_size: float = Field(..., gt=0)
    distance_to_city_center: float = Field(..., ge=0)
    school_rating: float = Field(..., ge=0, le=10)


class PredictionRecord(BaseModel):
    """A stored prediction including input features, result, and timestamp."""

    id: int
    features: HouseFeatures
    predicted_price: float
    created_at: str


class SinglePredictionRequest(HouseFeatures):
    """Request body for a single prediction."""

    pass


class SinglePredictionResponse(BaseModel):
    """Response for a single prediction."""

    predicted_price: float
    record: PredictionRecord


class CompareRequest(BaseModel):
    """Request body for comparing multiple properties."""

    items: List[HouseFeatures] = Field(..., min_length=2, max_length=10)


class CompareResponse(BaseModel):
    """Response for a comparison request."""

    results: List[dict]


class HistoryResponse(BaseModel):
    """Response containing the prediction history."""

    history: List[PredictionRecord]
    count: int


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    ml_service_reachable: bool


# ---------------------------------------------------------------------------
# In-memory history store
# ---------------------------------------------------------------------------

class HistoryStore:
    """
    Simple in-memory store of prediction records.
    Resets on service restart, which is acceptable for an interview demo.
    """

    def __init__(self):
        self._records: List[PredictionRecord] = []
        self._next_id = 1

    def add(self, features: HouseFeatures, predicted_price: float) -> PredictionRecord:
        """Add a new prediction to history."""
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
        """Return history ordered newest first."""
        return list(reversed(self._records))


history_store = HistoryStore()


# ---------------------------------------------------------------------------
# HTTP client lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create a reusable async HTTP client at startup."""
    # trust_env=False prevents the client from picking up the Windows system proxy
    # (common in corporate/Clash environments) which breaks calls to localhost.
    app.state.http_client = httpx.AsyncClient(base_url=ML_SERVICE_URL, timeout=30.0, trust_env=False)
    yield
    await app.state.http_client.aclose()


app = FastAPI(
    title="Property Value Estimator API",
    description="Python backend for the Property Value Estimator app.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow CORS so the Next.js dev server can call this backend directly if needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _features_to_dict(features: HouseFeatures) -> dict:
    """Convert a Pydantic model into the dict format expected by ml-service."""
    return features.model_dump()


async def _call_ml_predict(client: httpx.AsyncClient, features: HouseFeatures) -> float:
    """Call the ml-service /predict endpoint and return the predicted price."""
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
    """Call the ml-service /predict/batch endpoint."""
    payload = {"items": [_features_to_dict(item) for item in items]}
    response = await client.post("/predict/batch", json=payload)
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"ML service error: {response.text}",
        )
    return response.json()["predictions"]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """Check that this service can reach the ml-service."""
    try:
        # trust_env=False avoids routing health checks through a system proxy.
        async with httpx.AsyncClient(trust_env=False) as client:
            resp = await client.get(f"{ML_SERVICE_URL}/health", timeout=5.0)
        ml_reachable = resp.status_code == status.HTTP_200_OK
    except Exception:
        ml_reachable = False

    return HealthResponse(status="healthy", ml_service_reachable=ml_reachable)


@app.post(
    "/api/v1/predictions",
    response_model=SinglePredictionResponse,
    tags=["Predictions"],
)
async def create_prediction(request: SinglePredictionRequest):
    """
    Create a single property price prediction.
    Stores the result in history and returns it to the caller.
    """
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
    """Return the prediction history, newest first."""
    history = history_store.list_all()
    return HistoryResponse(history=history, count=len(history))


@app.post(
    "/api/v1/predictions/compare",
    response_model=CompareResponse,
    tags=["Predictions"],
)
async def compare_predictions(request: CompareRequest):
    """
    Compare predicted prices for multiple properties side-by-side.
    Does not store comparison items in the main history.
    """
    client: httpx.AsyncClient = app.state.http_client
    predictions = await _call_ml_predict_batch(client, request.items)

    results = []
    for features, price in zip(request.items, predictions):
        results.append(
            {
                "features": _features_to_dict(features),
                "predicted_price": price,
            }
        )

    return CompareResponse(results=results)


# ---------------------------------------------------------------------------
# Local development entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
