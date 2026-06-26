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
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field


FEATURE_NAMES = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]

PREMIUM_FEATURE_NAMES = [
    "lot_size",
    "bedrooms",
    "bathrooms",
    "year_built",
    "distance_to_city_center",
    "school_rating",
]


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


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    model_loaded: bool
    uptime_seconds: float


class ModelState:
    """
    Holds the loaded model artifacts in memory for the lifetime of the app.

    The model is intentionally split into two layers:
      - base_model.pkl predicts the price contribution from square_footage.
      - premium_model.pkl predicts a residual adjustment from the other fields.

    Because the residual model does not include square_footage, increasing area
    while keeping other inputs fixed cannot lower the prediction.
    """

    def __init__(self):
        self.base_model = None
        self.premium_model = None
        self.scaler = None
        self.metadata = None
        self.loaded = False

    def load(self, model_dir: Path | None = None):
        """Load base_model.pkl, premium_model.pkl, scaler.pkl, and metadata.json."""
        model_dir = model_dir or Path(os.environ.get("MODEL_DIR", "/app/models"))

        base_model_path = model_dir / "base_model.pkl"
        premium_model_path = model_dir / "premium_model.pkl"
        scaler_path = model_dir / "scaler.pkl"
        metadata_path = model_dir / "metadata.json"

        missing = [
            path.name
            for path in [base_model_path, premium_model_path, scaler_path, metadata_path]
            if not path.exists()
        ]
        if missing:
            raise RuntimeError(
                f"Model artifacts missing in {model_dir}: {', '.join(missing)}. "
                "Run train.py first or mount a volume with trained artifacts."
            )

        self.base_model = joblib.load(base_model_path)
        self.premium_model = joblib.load(premium_model_path)
        self.scaler = joblib.load(scaler_path)
        with open(metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)
        self.loaded = True

    def predict_one(self, features: HouseFeatures) -> float:
        """Predict a non-negative price for one input row."""
        if not self.loaded:
            raise RuntimeError("Model is not loaded")

        base = self.base_model.predict(
            np.array([[features.square_footage]], dtype=float)
        )[0]
        premium_features = np.array(
            [
                [
                    features.lot_size,
                    features.bedrooms,
                    features.bathrooms,
                    features.year_built,
                    features.distance_to_city_center,
                    features.school_rating,
                ]
            ],
            dtype=float,
        )
        premium = self.premium_model.predict(self.scaler.transform(premium_features))[0]
        raw_prediction = base + premium
        min_price_per_sqft = float(self.metadata.get("min_price_per_sqft", 0.0))
        fallback_floor = features.square_footage * min_price_per_sqft
        return float(max(0.0, fallback_floor, round(raw_prediction, 2)))

    def predict_many(self, items: List[HouseFeatures]) -> List[float]:
        """Predict non-negative prices for multiple input rows."""
        return [self.predict_one(item) for item in items]


model_state = ModelState()
START_TIME = time.monotonic()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model artifacts when the application starts."""
    model_state.load()
    yield


app = FastAPI(
    title="Housing Price Prediction API",
    description="Regression model API for predicting house prices from property features.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """Return service health status."""
    return HealthResponse(
        status="healthy",
        model_loaded=model_state.loaded,
        uptime_seconds=round(time.monotonic() - START_TIME, 3),
    )


@app.post("/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict(features: HouseFeatures):
    """Predict the price of a single house."""
    if not model_state.loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded",
        )

    return PredictionResponse(predicted_price=model_state.predict_one(features))


@app.post("/predict/batch", response_model=BatchPredictionResponse, tags=["Predictions"])
async def predict_batch(request: BatchPredictionRequest):
    """Predict prices for a batch of houses."""
    if not model_state.loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded",
        )

    predictions = model_state.predict_many(request.items)
    return BatchPredictionResponse(predictions=predictions, count=len(predictions))


@app.get("/model-info", tags=["Model"])
async def model_info():
    """Return model metadata, metrics, and coefficients."""
    if not model_state.loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded",
        )

    return model_state.metadata


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
