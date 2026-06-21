"""
Train a linear regression model to predict housing prices.

This script is intended to run inside the ml-service container at build time,
but can also be run locally during development. It reads the training CSV,
trains a LinearRegression model on scaled features, evaluates it, and persists:
  - model.pkl      : the fitted scikit-learn model
  - scaler.pkl     : the fitted StandardScaler
  - metadata.json  : metrics, coefficients, and feature names
"""

import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


# Feature column names expected in the training CSV.
# The order here is important: it must match the order used at prediction time.
FEATURE_COLUMNS = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]

# Name of the target column in the training CSV.
TARGET_COLUMN = "price"


def load_data(csv_path: str) -> pd.DataFrame:
    """Load the training CSV and validate required columns."""
    df = pd.read_csv(csv_path)

    missing_features = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing_features:
        raise ValueError(f"Training data missing feature columns: {missing_features}")
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Training data missing target column: {TARGET_COLUMN}")

    # Drop rows with missing values in the columns we care about.
    df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])
    return df


def train_model(df: pd.DataFrame):
    """
    Train a LinearRegression model on scaled features.

    Returns a tuple of (model, scaler, metadata) where metadata is a dict
    containing performance metrics and model coefficients.
    """
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    # Split to get an honest estimate of performance. With only 50 rows we use
    # a 80/20 split and a fixed random state for reproducibility.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Scale features to zero mean and unit variance. Linear regression is
    # sensitive to feature scales (e.g. square_footage is thousands, school_rating
    # is single digits), so scaling improves numerical stability and makes the
    # learned coefficients comparable.
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LinearRegression()
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)

    metadata = {
        "model_type": "LinearRegression",
        "feature_names": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "metrics": {
            "r2": float(r2_score(y_test, y_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
            "mae": float(mean_absolute_error(y_test, y_pred)),
        },
        "coefficients": [float(c) for c in model.coef_],
        "intercept": float(model.intercept_),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
    }

    return model, scaler, metadata


def save_artifacts(model, scaler, metadata: dict, output_dir: str):
    """Persist model, scaler, and metadata to disk."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, out / "model.pkl")
    joblib.dump(scaler, out / "scaler.pkl")

    with open(out / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Artifacts saved to {out.resolve()}")
    print(json.dumps(metadata, indent=2))


def main():
    """Entry point: load data, train, evaluate, save."""
    data_path = os.environ.get("DATA_PATH", "/app/data/housing_train.csv")
    output_dir = os.environ.get("MODEL_DIR", "/app/models")

    print(f"Loading training data from {data_path}")
    df = load_data(data_path)
    print(f"Loaded {len(df)} rows")

    print("Training model...")
    model, scaler, metadata = train_model(df)

    save_artifacts(model, scaler, metadata, output_dir)


if __name__ == "__main__":
    main()
