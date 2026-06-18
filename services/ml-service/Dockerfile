# Dockerfile for the ML service (Task 1).
# It installs dependencies, then trains the model at startup (if needed)
# using the mounted training CSV, and starts the FastAPI application.

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required by some Python packages.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency file first to leverage Docker layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code.
COPY train.py main.py ./

# Environment variables used by train.py and main.py.
ENV DATA_PATH=/app/data/housing_train.csv
ENV MODEL_DIR=/app/models
ENV PORT=8001

# Create directories. The data directory is populated by a runtime volume mount.
RUN mkdir -p /app/models /app/data

# Expose the FastAPI port.
EXPOSE 8001

# At container start, train the model if artifacts are missing, then start Uvicorn.
# We use a single worker because the model is loaded in memory and shared state
# is simpler for this interview demo.
CMD sh -c "if [ ! -f /app/models/model.pkl ]; then python train.py; fi && uvicorn main:app --host 0.0.0.0 --port 8001"
