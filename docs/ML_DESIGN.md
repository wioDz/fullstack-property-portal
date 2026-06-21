# ML Service Design

## How the ML Service Works Today

The ML service (`services/ml-service/`) is a **FastAPI application** that exposes a trained scikit-learn regression model over HTTP. It has two responsibilities:

1. **Load trained artifacts** at startup.
2. **Run inference** on incoming property features.

### Artifacts

When the container builds (or when you run `train.py` locally), three files are produced in `MODEL_DIR` (default `/app/models`):

| File | Purpose |
|------|---------|
| `model.pkl` | The fitted `LinearRegression` model from scikit-learn. |
| `scaler.pkl` | The fitted `StandardScaler` used to normalize features before inference. |
| `metadata.json` | Model type, feature names, performance metrics (R², RMSE, MAE), coefficients, intercept, and sample counts. |

### Startup Flow

```
Container starts
    │
    ▼
Lifespan hook loads:
  • model.pkl
  • scaler.pkl
  • metadata.json
    │
    ▼
FastAPI is ready to accept requests
```

### Training Pipeline (`train.py`)

1. **Load data** from `housing_train.csv`.
2. **Validate** that all required feature columns and the target `price` column exist.
3. **Split** the data into 80% training / 20% test using `random_state=42` for reproducibility.
4. **Scale** features with `StandardScaler`:
   - Features are on very different scales (square footage in thousands, school rating 0–10).
   - Scaling improves numerical stability and makes coefficients comparable.
5. **Train** a `LinearRegression` model on the scaled training data.
6. **Evaluate** on the test split using R², RMSE, and MAE.
7. **Save** model, scaler, and metadata to disk.

### Inference Flow (`main.py`)

For a single prediction (`POST /predict`):

1. Receive a JSON payload with the seven property features.
2. Pydantic validates ranges (e.g. `square_footage > 0`, `year_built` between 1800–2100).
3. Convert the JSON object into a NumPy array in the exact feature order stored in `FEATURE_NAMES`.
4. Reshape to a 2D array with one row.
5. Apply `scaler.transform()` using the scaler loaded at startup.
6. Call `model.predict(X_scaled)`.
7. Round the result to two decimals and return `{ "predicted_price": 425000.0 }`.

For batch prediction (`POST /predict/batch`):

1. Receive up to 1000 property feature sets.
2. Stack them into one 2D NumPy array.
3. Scale once and call `model.predict()` on the whole batch.
4. Return `{ "predictions": [...], "count": N }`.

### Model Metadata Endpoint (`GET /model-info`)

Returns the contents of `metadata.json`, useful for debugging or explaining the model in the UI:

```json
{
  "model_type": "LinearRegression",
  "feature_names": ["square_footage", "bedrooms", ...],
  "metrics": { "r2": 0.92, "rmse": 12345, "mae": 9876 },
  "coefficients": [...],
  "intercept": 12345.67,
  "training_samples": 40,
  "test_samples": 10
}
```

## How the Model Predicts Price

The current model is a **multivariate linear regression**:

```
price = intercept
      + coef_square_footage  × square_footage
      + coef_bedrooms        × bedrooms
      + coef_bathrooms       × bathrooms
      + coef_year_built      × year_built
      + coef_lot_size        × lot_size
      + coef_distance        × distance_to_city_center
      + coef_school_rating   × school_rating
```

Before the dot product is computed, each feature is standardized:

```
scaled_feature = (feature - mean(feature)) / std(feature)
```

This means the model learns weights on a normalized scale, so a one-standard-deviation change in any feature has a comparable effect on the predicted price.

### Interpreting Coefficients

Because features are scaled, the magnitude of each coefficient tells you how strongly that feature moves the price **relative to its own typical variation**:

- Large positive coefficient → increasing that feature by one standard deviation increases price a lot.
- Large negative coefficient → increasing that feature decreases price a lot.
- Near-zero coefficient → that feature has little linear relationship with price in this dataset.

## Is It "Self-Learning"?

**Not yet.** The current implementation uses **batch offline learning**:

- The model is trained once from `housing_train.csv`.
- After training, the model weights are frozen.
- Every prediction uses the same static model.

To make the system self-learning (also called **online learning**, **continual learning**, or **incremental learning**), you need a feedback loop that updates the model as new data arrives.

## Design Options for Self-Learning

### Option 1: Scheduled Retraining (Simplest)

Keep the batch approach, but retrain the model periodically.

```
New sales data arrives
        │
        ▼
Store in database / object store
        │
        ▼
Scheduled job (cron / Airflow / Celery Beat)
   runs every night / week
        │
        ▼
Retrain model on full dataset (old + new)
        │
        ▼
Save new model.pkl + scaler.pkl + metadata.json
        │
        ▼
Restart or hot-reload ML service
```

**Pros:** Simple, stable, easy to validate before deployment.

**Cons:** Predictions are stale until the next retrain; requires downtime or a rolling update.

**Implementation sketch:**

```python
# services/ml-service/retrain.py
from train import load_data, train_model, save_artifacts

def retrain():
    # Load all historical + new data
    df = load_data("/app/data/all_sales.csv")
    model, scaler, metadata = train_model(df)
    save_artifacts(model, scaler, metadata, "/app/models")
    # Trigger service reload or upload to model registry

if __name__ == "__main__":
    retrain()
```

### Option 2: Incremental / Online Learning

Use an algorithm that supports partial fitting, such as:

- `sklearn.linear_model.SGDRegressor` (supports `partial_fit`)
- `sklearn.linear_model.PassiveAggressiveRegressor`
- River / Vowpal Wabbit for true online learning

Flow:

```
User gets a prediction
        │
        ▼
Later, the actual sale price is known
        │
        ▼
Call partial_fit([features], [actual_price])
        │
        ▼
Model weights are updated in memory
        │
        ▼
Periodically persist updated model to disk
```

**Pros:** Model adapts immediately; no full retrain needed.

**Cons:** Can drift or overfit to recent data; harder to debug and rollback.

**Implementation sketch with SGDRegressor:**

```python
from sklearn.linear_model import SGDRegressor
from sklearn.preprocessing import StandardScaler
import joblib

# Load existing model and scaler
model: SGDRegressor = joblib.load("/app/models/model.pkl")
scaler: StandardScaler = joblib.load("/app/models/scaler.pkl")

# New labeled sample
new_X = scaler.transform([[1800, 4, 2.5, 2005, 8000, 3.2, 9]])
new_y = [430000]

# Update model incrementally
model.partial_fit(new_X, new_y)

# Save updated model
joblib.dump(model, "/app/models/model.pkl")
```

Add an endpoint:

```python
@app.post("/feedback")
async def feedback(features: HouseFeatures, actual_price: float):
    """Receive a labeled sample and update the model incrementally."""
    X = _features_to_array(features)
    X_scaled = model_state.scaler.transform(X)
    model_state.model.partial_fit(X_scaled, [actual_price])
    # Persist periodically or on every N samples
    return {"status": "updated"}
```

### Option 3: Model Registry + Blue/Green Deployment

For production, use a model registry (MLflow, DVC, Weights & Biases, or a simple S3 bucket) and a deployment pipeline:

```
Train new model
        │
        ▼
Evaluate on hold-out set
        │
        ▼
Push to model registry (versioned)
        │
        ▼
CI/CD deploys new version
        │
        ▼
ML service loads new model via hot-reload or rolling update
```

This is the most robust pattern for real systems. It keeps the ML service simple (just load and predict) while the complexity of training and versioning lives elsewhere.

## Recommended Path Forward

For this demo project, the easiest upgrade to "self-learning" is **Option 1 (scheduled retraining)**:

1. Collect new labeled samples (features + actual sold price) in a database or append to a CSV.
2. Add a `retrain.py` script that retrains on the full dataset.
3. Run it on a schedule (e.g. `docker compose exec ml-service python retrain.py`).
4. Restart the ML service to load the new model, or implement a hot-reload endpoint.

If you want near-real-time adaptation, move to **Option 2 (SGDRegressor + feedback endpoint)** but add safeguards:

- Track prediction error over a sliding window.
- Only update when error exceeds a threshold.
- Keep a shadow model for validation.
- Roll back if performance degrades.

## Hot-Reloading the Model

Currently the model is loaded once at startup. To support retraining without restarting the container, add a reload endpoint:

```python
@app.post("/admin/reload")
async def reload_model():
    """Reload model artifacts from disk. Call after retraining."""
    model_state.load()
    return {"status": "reloaded", "model_loaded": model_state.loaded}
```

Then your retraining pipeline becomes:

```bash
python retrain.py          # writes new artifacts
curl -X POST http://localhost:8001/admin/reload
```

## Monitoring a Self-Learning Model

Whatever approach you choose, track these metrics over time:

| Metric | Why It Matters |
|--------|----------------|
| Prediction error (MAE/RMSE) on a hold-out set | Detects model degradation. |
| Feature drift (mean/std per feature over time) | Detects when incoming data changes distribution. |
| Prediction distribution | Spots anomalies or collapse to a narrow range. |
| Number of feedback samples | Ensures enough data for incremental updates. |
| Training time | Alerts on retraining jobs that hang or grow too slow. |

## Security & Safety Notes

- Validate inputs with Pydantic (already done).
- Rate-limit the `/feedback` endpoint to prevent adversarial updates.
- Log every model update with the sample features and actual price.
- Keep backups of previous model versions for rollback.
- Do not blindly retrain on user-submitted data without human review; labeled sales data should come from a trusted source.

## Summary

| Aspect | Current Design | Future Self-Learning |
|--------|---------------|---------------------|
| Algorithm | LinearRegression | LinearRegression / SGDRegressor |
| Training | Once at build time | Scheduled retrain or incremental partial_fit |
| Feedback loop | None | `/feedback` endpoint or batch ingestion |
| Model update | Manual restart | Hot-reload endpoint or rolling deployment |
| Data source | CSV file | Database / data lake |
| Monitoring | Basic metrics | Drift, error, and performance dashboards |
