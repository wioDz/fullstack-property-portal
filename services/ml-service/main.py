"""
FastAPI application exposing the trained housing price regression model.

Endpoints:
  GET  /health         - health check
  POST /predict        - single prediction
  POST /predict/batch  - batch prediction
  GET  /model-info     - model coefficients and performance metrics
"""

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Feature schema constants
# ---------------------------------------------------------------------------

# These names define the expected input order and are stored in metadata.json.
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
# Pydantic request/response models
# ---------------------------------------------------------------------------

class HouseFeatures(BaseModel):
    """Input features for a single house price prediction."""

    square_footage: float = Field(..., gt=0, description="Living area in square feet")
    bedrooms: float = Field(..., ge=0, description="Number of bedrooms")
    bathrooms: float = Field(..., ge=0, description="Number of bathrooms")
    year_built: int = Field(..., ge=1800, le=2100, description="Year the house was built")
    lot_size: float = Field(..., gt=0, description="Lot size in square feet")
    distance_to_city_center: float = Field(..., ge=0, description="Miles to city center")
    school_rating: float = Field(..., ge=0, le=10, description="School district rating 0-10")


class BatchPredictionRequest(BaseModel):
    """Wrapper for batch predictions."""

    items: List[HouseFeatures] = Field(..., min_length=1, max_length=1000)


class PredictionResponse(BaseModel):
    """Single prediction response."""

    predicted_price: float


class BatchPredictionResponse(BaseModel):
    """Batch prediction response."""

    predictions: List[float]
    count: int


class ModelInfoResponse(BaseModel):
    """Model metadata including performance metrics and coefficients."""

    model_type: str
    feature_names: List[str]
    metrics: dict
    coefficients: List[float]
    intercept: float
    training_samples: int
    test_samples: int


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    model_loaded: bool


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

class ModelState:
    """Holds the loaded model artifacts in memory for the lifetime of the app."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.metadata = None
        self.loaded = False

    def load(self):
        """Load model.pkl, scaler.pkl, and metadata.json from MODEL_DIR."""
        model_dir = Path(os.environ.get("MODEL_DIR", "/app/models"))

        model_path = model_dir / "model.pkl"
        scaler_path = model_dir / "scaler.pkl"
        metadata_path = model_dir / "metadata.json"

        if not model_path.exists() or not scaler_path.exists() or not metadata_path.exists():
            raise RuntimeError(
                f"Model artifacts not found in {model_dir}. "
                "Run train.py first or mount a volume with trained artifacts."
            )

        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        with open(metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)
        self.loaded = True


# Global application state.
model_state = ModelState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model artifacts when the application starts."""
    model_state.load()
    yield
    # Nothing to clean up; the model stays in memory until the process exits.


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Housing Price Prediction API",
    description="Regression model API for predicting house prices from property features.",
    version="1.0.0",
    lifespan=lifespan,
)


def _features_to_array(features: HouseFeatures) -> np.ndarray:
    """Convert a Pydantic HouseFeatures instance into a NumPy array in feature order."""
    return np.array(
        [
            features.square_footage,
            features.bedrooms,
            features.bathrooms,
            features.year_built,
            features.lot_size,
            features.distance_to_city_center,
            features.school_rating,
        ]
    ).reshape(1, -1)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """Return service health status."""
    return HealthResponse(status="healthy", model_loaded=model_state.loaded)


@app.post("/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict(features: HouseFeatures):
    """Predict the price of a single house."""
    if not model_state.loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded",
        )

    X = _features_to_array(features)
    X_scaled = model_state.scaler.transform(X)
    predicted = model_state.model.predict(X_scaled)[0]

    return PredictionResponse(predicted_price=float(round(predicted, 2)))


@app.post("/predict/batch", response_model=BatchPredictionResponse, tags=["Predictions"])
async def predict_batch(request: BatchPredictionRequest):
    """Predict prices for a batch of houses."""
    if not model_state.loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded",
        )

    # Stack all input rows into a single 2D array for efficient inference.
    X = np.vstack([_features_to_array(item) for item in request.items])
    X_scaled = model_state.scaler.transform(X)
    predictions = model_state.model.predict(X_scaled)

    return BatchPredictionResponse(
        predictions=[float(round(p, 2)) for p in predictions],
        count=len(predictions),
    )


@app.get("/model-info", response_model=ModelInfoResponse, tags=["Model"])
async def model_info():
    """Return model metadata, metrics, and coefficients."""
    if not model_state.loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded",
        )

    return ModelInfoResponse(**model_state.metadata)


# ---------------------------------------------------------------------------
# Local development entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
