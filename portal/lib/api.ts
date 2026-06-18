import {
  CompareResult,
  FilterRequest,
  HouseRecord,
  MarketStatistics,
  PredictionResponse,
  WhatIfRequest,
  WhatIfResponse,
} from './types';

/**
 * Base URLs for the backend services.
 *
 * Server components and API route handlers can call the backends directly
 * using the environment variables. Client components call the Next.js API
 * proxy routes (relative URLs) so requests stay same-origin.
 */
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8002';
const JAVA_BACKEND_URL = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';

// In the browser, use the Next.js API proxy routes.
const isBrowser = typeof window !== 'undefined';
const pythonBase = isBrowser ? '' : PYTHON_BACKEND_URL;
const javaBase = isBrowser ? '' : JAVA_BACKEND_URL;

/**
 * Submit a single property to the Python backend for prediction.
 */
export async function predictProperty(features: { [key: string]: number }): Promise<PredictionResponse> {
  const res = await fetch(`${pythonBase}/api/estimator/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features),
  });
  if (!res.ok) {
    throw new Error(`Prediction failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch the prediction history from the Python backend.
 */
export async function fetchHistory(): Promise<{ history: PredictionResponse['record'][]; count: number }> {
  const res = await fetch(`${pythonBase}/api/estimator/history`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch history: ${res.status}`);
  }
  return res.json();
}

/**
 * Compare multiple properties via the Python backend batch endpoint.
 */
export async function compareProperties(
  items: { [key: string]: number }[]
): Promise<CompareResult[]> {
  const res = await fetch(`${pythonBase}/api/estimator/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    throw new Error(`Comparison failed: ${res.status}`);
  }
  const data = await res.json();
  return data.results;
}

/**
 * Fetch overall market statistics from the Java backend.
 */
export async function fetchMarketStatistics(): Promise<MarketStatistics> {
  const res = await fetch(`${javaBase}/api/market/statistics`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch statistics: ${res.status}`);
  }
  return res.json();
}

/**
 * Filter market records from the Java backend.
 */
export async function filterMarketRecords(filters: FilterRequest): Promise<HouseRecord[]> {
  const res = await fetch(`${javaBase}/api/market/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
  if (!res.ok) {
    throw new Error(`Filter failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Run a what-if analysis via the Java backend.
 */
export async function runWhatIf(request: WhatIfRequest): Promise<WhatIfResponse> {
  const res = await fetch(`${javaBase}/api/market/whatif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error(`What-if failed: ${res.status}`);
  }
  return res.json();
}
