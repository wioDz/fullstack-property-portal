# Project Architecture & Workflow

## Overview

This is a containerized full-stack demo of a **housing price prediction** system. It exposes two user-facing applications through a single Next.js portal:

1. **Property Value Estimator** — predict a house price from features, save estimates, compare properties.
2. **Property Market Analysis** — explore market statistics, filter records, run what-if scenarios, and export data.

The system is intentionally split into small, single-responsibility services so each layer can be swapped or scaled independently.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Next.js Portal                             │
│                     (React 19 + Next.js 15 App Router)              │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────────┐  │
│  │   Estimator  │  │  Market Analysis │  │  API Proxy Routes     │  │
│  │    Page      │  │      Page        │  │  (/api/estimator/*)   │  │
│  └──────────────┘  └─────────────────┘  │  (/api/market/*)      │  │
│                                         └───────────┬───────────┘  │
└─────────────────────────────────────────────────────┼───────────────┘
                                                      │
                              ┌───────────────────────┼───────────────────────┐
                              │                       │                       │
                    ┌─────────▼──────────┐  ┌────────▼─────────┐  ┌─────────▼──────────┐
                    │  Python Backend    │  │   Java Backend   │  │     ML Service     │
                    │  (FastAPI)         │  │  (Spring Boot)   │  │   (FastAPI +       │
                    │  Port 8002         │  │  Port 8080       │  │    scikit-learn)   │
                    │                    │  │                  │  │   Port 8001        │
                    │ • /health          │  │ • /health        │  │                    │
                    │ • /api/v1/predict  │  │ • /api/v1/market │  │ • /health          │
                    │ • /api/v1/compare  │  │   /statistics    │  │ • /predict         │
                    │ • /api/v1/history  │  │ • /api/v1/market │  │ • /predict/batch   │
                    │                    │  │   /filter        │  │ • /model-info      │
                    │                    │  │ • /api/v1/market │  │                    │
                    │                    │  │   /whatif        │  │                    │
                    │                    │  │ • /api/v1/market │  │                    │
                    │                    │  │   /export/{csv,  │  │                    │
                    │                    │  │   pdf}           │  │                    │
                    └─────────┬──────────┘  └────────┬─────────┘  └────────────────────┘
                              │                        │
                              │            ┌───────────▼────────────┐
                              │            │  Calls /predict for    │
                              │            │  what-if analysis      │
                              │            └────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Calls /predict    │
                    │  and /predict/batch│
                    └────────────────────┘
```

## Why This Split?

| Service | Responsibility | Technology | Reason |
|---------|---------------|------------|--------|
| **ML Service** | Own the trained model and inference | Python + FastAPI + scikit-learn | Python is the standard ML stack; keeps model training and prediction in one place. |
| **Python Backend** | Orchestrate estimator requests and maintain prediction history | FastAPI | Provides a stable API contract for the portal and isolates the portal from ML service details. |
| **Java Backend** | Market analysis, filtering, caching, exports | Spring Boot | Demonstrates a polyglot stack; Java is strong at data aggregation, caching, and report generation. |
| **Next.js Portal** | Unified UI and API proxy | Next.js 15 + React 19 | Server-side rendering, static generation, and single-origin API routes for the browser. |

## Request Flow

### Single Prediction (Estimator)

1. User fills the form on `/estimator` and clicks **Predict Price**.
2. Browser calls `POST /api/estimator/predictions` on the Next.js portal.
3. Next.js route handler forwards the request to the **Python backend** at `/api/v1/predictions`.
4. Python backend validates the input and calls the **ML Service** at `/predict`.
5. ML Service loads `model.pkl` and `scaler.pkl`, scales the features, runs inference, and returns the predicted price.
6. Python backend stores the result in an in-memory history store and returns the record.
7. Next.js returns the response to the browser; the portal adds it to localStorage-backed history.

### Batch Comparison (Estimator)

1. User selects two or more history rows and clicks **Compare Selected**.
2. Browser calls `POST /api/estimator/compare`.
3. Next.js forwards to Python backend `/api/v1/predictions/compare`.
4. Python backend calls ML Service `/predict/batch`.
5. ML Service returns prices for all items in one inference pass.
6. Results are returned to the browser and rendered as a bar chart.

### Market Dashboard (Market Analysis)

1. Browser loads `/market`.
2. `useQuery` fetches `/api/market/statistics` and `/api/market/filter`.
3. Next.js forwards statistics to the **Java backend** `/api/v1/market/statistics`.
4. Java backend loads the full CSV from disk, computes aggregates (avg, median, min, max), and caches the result with Caffeine.
5. Filtered records are fetched similarly and rendered as KPI cards, charts, and a table.

### What-If Analysis (Market Analysis)

1. User enters hypothetical property features and clicks **Run Prediction**.
2. Browser calls `POST /api/market/whatif`.
3. Next.js forwards to Java backend `/api/v1/market/whatif`.
4. Java backend calls ML Service `/predict` via `MlClientService`.
5. Java backend also finds comparable properties from the CSV dataset.
6. Predicted price + comparables are returned to the browser.

### Export

1. User clicks **CSV** or **PDF** in the market table.
2. Browser navigates to `/api/market/export/csv` or `/api/market/export/pdf`.
3. Next.js streams bytes from Java backend `/api/v1/market/export/{csv,pdf}`.
4. Java backend generates the file and sets `Content-Disposition: attachment` so the browser downloads it.

## Data Flow Summary

| Feature | Portal → Next.js API → Backend → ML Service |
|---------|---------------------------------------------|
| Single prediction | `/estimator` → `/api/estimator/predictions` → Python backend → ML Service `/predict` |
| Batch comparison | `/estimator` → `/api/estimator/compare` → Python backend → ML Service `/predict/batch` |
| Market statistics | `/market` → `/api/market/statistics` → Java backend (CSV + cache) |
| Market filter | `/market` → `/api/market/filter` → Java backend (CSV + cache) |
| What-if | `/market` → `/api/market/whatif` → Java backend → ML Service `/predict` |
| Export | `/market` → `/api/market/export/{csv,pdf}` → Java backend |

## Caching Strategy

- **Java backend** uses Spring + Caffeine:
  - `marketStatistics` — cached overall statistics.
  - `filteredRecords` — cached by request hash.
- **Next.js portal** uses `cache: 'no-store'` on backend fetches to avoid stale proxy responses; TanStack Query handles client-side caching with a 30-second stale time.
- **ML Service** keeps model artifacts in memory after startup, so inference is fast.

## State Management

- **Server state** (market data, predictions) → TanStack Query (`useQuery`).
- **Client state** (estimator history, selected comparison rows) → Zustand with `persist` middleware → `localStorage`.
- **SSR/hydration safety** — persisted Zustand state is wrapped in `<ClientOnly>` so it does not render during server-side rendering.

## Container & Deployment Flow

```
docker compose up --build
```

1. `ml-service` builds the image, runs `train.py` to generate `model.pkl`, and starts the FastAPI app.
2. `python-backend` starts and connects to `ml-service` via the `ML_SERVICE_URL` env var.
3. `java-backend` starts, loads `housing_train.csv`, and connects to `ml-service` via `ml.service.url`.
4. `portal` builds the Next.js app and starts on port 3000.

All service-to-service communication inside Docker uses service names as hostnames (e.g. `http://ml-service:8001`).

## Local Development Workflow

Each service can run independently:

```bash
# ML Service
cd services/ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python train.py
uvicorn main:app --reload --port 8001

# Python Backend
cd services/python-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002

# Java Backend
cd services/java-backend
mvn clean package -DskipTests
java -jar target/market-analysis-1.0.0.jar

# Portal
cd portal
npm install
npm run dev
```

## Technology Stack

| Layer | Tools |
|-------|-------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts, TanStack Query, Zustand, React Hook Form + Zod |
| API Gateway / Proxy | Next.js API Routes (App Router) |
| ML / Data Science | Python, FastAPI, scikit-learn, pandas, joblib, numpy |
| Backend (Orchestration) | Python, FastAPI, httpx, pydantic |
| Backend (Analysis) | Java 21, Spring Boot, Caffeine, OpenPDF, OpenCSV |
| Containers | Docker, Docker Compose |
| Data | CSV (`housing_train.csv`, `housing_test.csv`) |

## Key Design Decisions

1. **Separate ML Service** — keeps the model, scaler, and metadata in one Python service so the model can be retrained or replaced without touching the orchestration backends.
2. **Portal API Proxy Routes** — the browser calls `/api/*` on the same origin, avoiding CORS and allowing environment-specific backend URLs on the server.
3. **In-Memory History** — the Python backend stores prediction history in memory for the demo. For production this should be replaced with a database.
4. **CSV as Data Source** — the Java backend loads the housing dataset from CSV at startup. For production this could be a database or object store.
5. **Polyglot Backends** — Python for ML, Java for market analysis, Next.js for UI. This mirrors real teams where different services use the best tool for the job.

## Extending the System

- **Add a database**: Replace in-memory history and CSV repository with PostgreSQL or MongoDB.
- **Add authentication**: Protect estimator/market routes with NextAuth or a custom auth service.
- **Add real-time updates**: Use WebSockets or Server-Sent Events for live market data.
- **Improve ML**: See `docs/ML_DESIGN.md` for self-learning/online learning options.
- **Add tests**: Unit tests for services, integration tests for the Docker compose stack, and E2E tests with Playwright.
