# Fullstack Property Portal

A containerized fullstack demonstration of a housing price prediction system built with FastAPI, Spring Boot, and Next.js.

## Overview

This monorepo contains:

- **ML Service** (`services/ml-service/`) — FastAPI + scikit-learn regression model.
  - `GET /health` — health check
  - `POST /predict` — single prediction
  - `POST /predict/batch` — batch prediction
  - `GET /model-info` — model coefficients and metrics
- **Python Backend** (`services/python-backend/`) — FastAPI backend for the Property Value Estimator app.
- **Java Backend** (`services/java-backend/`) — Spring Boot backend for the Property Market Analysis app.
- **Next.js Portal** (`portal/`) — unified frontend hosting both applications.

## Quick Start (Docker Compose)

### Prerequisites

- Docker Desktop or Docker Engine with Docker Compose
- Git

### Run the entire stack

```bash
cd interview-project
docker compose up --build
```

Wait for all four services to start, then open:

- Portal: http://localhost:3000
- ML Service Swagger: http://localhost:8001/docs
- Python Backend Swagger: http://localhost:8002/docs
- Java Backend Swagger UI: http://localhost:8080/swagger-ui.html

### Note on Docker base images

The Dockerfiles use official base images from Docker Hub (`python:3.12-slim`, `node:20-alpine`, `eclipse-temurin:21-jre-alpine`). If your environment cannot reach Docker Hub, configure a registry mirror or pull the base images beforehand. The compose file and Dockerfiles are otherwise ready to run.

## Services

| Service | Port | Description |
|---------|------|-------------|
| ml-service | 8001 | Trained regression model API |
| python-backend | 8002 | Property Value Estimator API |
| java-backend | 8080 | Property Market Analysis API |
| portal | 3000 | Next.js unified portal |

## Demo Flow

1. Open the portal at http://localhost:3000.
2. Use the navigation to switch between:
   - **Estimator** — enter property details, view prediction, chart, history, and comparison.
   - **Market** — explore dashboards, filters, what-if analysis, and CSV/PDF exports.
3. Open http://localhost:8001/docs to show the ML model endpoints and try predictions live.

## Data

The `data/` directory contains:

- `housing_train.csv` — training data with prices.
- `housing_test.csv` — test data without prices for prediction demos.

These are copied from the provided interview files.

## Local Development

If Docker Hub is unavailable, you can run all services locally. Each service has been verified to work independently.

### 1. ML Service

```bash
cd services/ml-service
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Train the model. On Windows use an absolute path or a relative path with forward slashes.
DATA_PATH=../../data/housing_train.csv MODEL_DIR=./models python train.py

# Start the inference API.
MODEL_DIR=./models uvicorn main:app --reload --port 8001
```

### 2. Python Backend

In a new terminal:

```bash
cd services/python-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ML_SERVICE_URL=http://localhost:8001 uvicorn main:app --reload --port 8002
```

### 3. Java Backend

In a new terminal:

```bash
cd services/java-backend
mvn clean package -DskipTests

# DATA_PATH points to the CSV dataset; ML_SERVICE_URL points to the running ML service.
# On Windows use an absolute path or a relative path with forward slashes.
DATA_PATH=../../data/housing_train.csv ML_SERVICE_URL=http://localhost:8001 java -jar target/market-analysis-1.0.0.jar
```

### 4. Next.js Portal

In a new terminal:

```bash
cd portal
npm install
PYTHON_BACKEND_URL=http://localhost:8002 JAVA_BACKEND_URL=http://localhost:8080 npm run dev
```

Then open http://localhost:3000.

## Verification Commands

```bash
# Health checks
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8080/actuator/health

# ML prediction
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{"square_footage":1500,"bedrooms":3,"bathrooms":2,"year_built":2000,"lot_size":7000,"distance_to_city_center":4.0,"school_rating":8.0}'

# Portal estimator proxy
curl -X POST http://localhost:3000/api/estimator/predictions \
  -H "Content-Type: application/json" \
  -d '{"square_footage":1500,"bedrooms":3,"bathrooms":2,"year_built":2000,"lot_size":7000,"distance_to_city_center":4.0,"school_rating":8.0}'

# Market statistics
curl http://localhost:3000/api/market/statistics
```

## Publishing to GitHub

A local git repository is already initialized with two commits. To publish:

1. Create a public repository named `fullstack-property-portal` on GitHub.
2. Update the remote URL if your username differs:
   ```bash
   git remote set-url origin https://github.com/wioDz/fullstack-property-portal.git
   ```
3. Push:
   ```bash
   git push -u origin master
   ```

## Notes

- The ML model is trained at container startup if `base_model.pkl` or `premium_model.pkl` is not present in the mounted model volume.
- The Java backend caches market statistics with Caffeine.
- The Next.js portal proxies client requests to the Python and Java backends via `/api/*` routes.
- Explanatory comments are included throughout the source code.
