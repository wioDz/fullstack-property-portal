"""
Housing Price Prediction Model Training - Two-Layer Production Model
=====================================================================

Layer 1: LinearRegression on square_footage (base price driver)
Layer 2: Ridge regression on other features (premium adjustment)

This ensures square_footage is always the dominant price factor,
while other features provide fine-tuning.

Output Artifacts:
  - base_model.pkl    : LinearRegression for base price
  - premium_model.pkl : Ridge regression for premium adjustment
  - scaler.pkl        : StandardScaler for premium features
  - metadata.json     : Metrics and coefficients

Usage:
    DATA_PATH=../../data/housing_train.csv MODEL_DIR=./models python train.py
"""

import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


FEATURE_COLUMNS = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]
PREMIUM_FEATURES = [
    "lot_size",
    "bedrooms",
    "bathrooms",
    "year_built",
    "distance_to_city_center",
    "school_rating",
]
TARGET_COLUMN = "price"


def load_data(csv_path: str) -> pd.DataFrame:
    """Load and validate training data."""
    df = pd.read_csv(csv_path)
    required = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")
    return df.dropna(subset=required)


def train_two_layer_model(df: pd.DataFrame):
    """
    Train two-layer model:
      Layer 1: sqft -> base price (LinearRegression)
      Layer 2: other features -> premium (Ridge)
    """
    # Split data
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

    # ==================== Layer 1: Base Price ====================
    X_base_train = train_df[["square_footage"]].values
    y_train = train_df[TARGET_COLUMN].values

    base_model = LinearRegression(positive=True)
    base_model.fit(X_base_train, y_train)

    # Calculate base predictions and residuals (premium)
    train_df = train_df.copy()
    test_df = test_df.copy()
    train_df["base_price"] = base_model.predict(X_base_train)
    train_df["premium"] = train_df[TARGET_COLUMN] - train_df["base_price"]

    X_base_test = test_df[["square_footage"]].values
    test_df["base_price"] = base_model.predict(X_base_test)
    test_df["premium"] = test_df[TARGET_COLUMN] - test_df["base_price"]

    # ==================== Layer 2: Premium Adjustment ====================
    X_premium_train = train_df[PREMIUM_FEATURES].values
    y_premium_train = train_df["premium"].values

    scaler = StandardScaler()
    X_premium_train_scaled = scaler.fit_transform(X_premium_train)

    premium_model = Ridge(alpha=100.0)
    premium_model.fit(X_premium_train_scaled, y_premium_train)

    # Evaluate on test set
    X_premium_test = test_df[PREMIUM_FEATURES].values
    X_premium_test_scaled = scaler.transform(X_premium_test)

    test_df["predicted_premium"] = premium_model.predict(X_premium_test_scaled)
    test_df["predicted_price"] = np.maximum(
        0.0, test_df["base_price"] + test_df["predicted_premium"]
    )

    # Metrics
    y_true = test_df[TARGET_COLUMN].values
    y_pred = test_df["predicted_price"].values

    # Store a conservative floor for inference-time extrapolation below the
    # training size range, which prevents tiny homes from showing as $0.
    min_price_per_sqft = float(
        (df[TARGET_COLUMN] / df["square_footage"]).replace([np.inf, -np.inf], np.nan).dropna().min()
    )

    metadata = {
        "model_type": "TwoLayerMonotonicModel",
        "feature_names": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "layer_1": "LinearRegression (square_footage)",
        "layer_2": "RidgeRegression (other features)",
        "base_coefficient": float(base_model.coef_[0]),
        "base_intercept": float(base_model.intercept_),
        "premium_coefficients": [float(c) for c in premium_model.coef_],
        "premium_intercept": float(premium_model.intercept_),
        "premium_features": PREMIUM_FEATURES,
        "prediction_floor": 0.0,
        "min_price_per_sqft": min_price_per_sqft,
        "monotonic_features": ["square_footage"],
        "metrics": {
            "r2": float(r2_score(y_true, y_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
            "mae": float(mean_absolute_error(y_true, y_pred)),
        },
        "training_samples": len(train_df),
        "test_samples": len(test_df),
    }

    return base_model, premium_model, scaler, metadata


def save_artifacts(base_model, premium_model, scaler, metadata: dict, output_dir: str):
    """Save all model artifacts."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    joblib.dump(base_model, out / "base_model.pkl")
    joblib.dump(premium_model, out / "premium_model.pkl")
    joblib.dump(scaler, out / "scaler.pkl")

    with open(out / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Artifacts saved to {out.resolve()}")
    print(json.dumps(metadata, indent=2))


def main():
    data_path = os.environ.get("DATA_PATH", "/app/data/housing_train.csv")
    output_dir = os.environ.get("MODEL_DIR", "/app/models")

    print(f"Loading data from {data_path}")
    df = load_data(data_path)
    print(f"Loaded {len(df)} rows")

    print("Training two-layer production model...")
    base_model, premium_model, scaler, metadata = train_two_layer_model(df)

    save_artifacts(base_model, premium_model, scaler, metadata, output_dir)


if __name__ == "__main__":
    main()
