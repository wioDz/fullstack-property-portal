# Dockerfile for the Property Value Estimator Python backend (App 1).
FROM python:3.12-slim

WORKDIR /app

# Install curl for the Docker healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

ENV PORT=8002
ENV ML_SERVICE_URL=http://ml-service:8001

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
