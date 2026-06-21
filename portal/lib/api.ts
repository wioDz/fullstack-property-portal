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
 * Extract a human-readable error message from a failed fetch response.
 * Falls back to the HTTP status if the body is not JSON.
 */
async function getErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.detail || data.error || data.message || `${fallback}: ${res.status}`;
  } catch {
    return `${fallback}: ${res.status} ${res.statusText}`;
  }
}

/**
 * Base URLs for the backend services.
 *
 * Server components and API route handlers can call the backends directly
 * using the environment variables. Client components call the Next.js API
 * proxy routes (relative URLs) so requests stay same-origin and avoid CORS.
 *
 * Why two modes?
 * - During SSR/server rendering, `window` is undefined, so we call the
 *   backends directly via their Docker/service names (e.g. http://python-backend:8002).
 * - In the browser, `window` is defined, so we call `/api/...` routes handled
 *   by this Next.js app. Those routes then forward the request to the backend.
 */
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8002';
const JAVA_BACKEND_URL = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';

const isBrowser = typeof window !== 'undefined';
const pythonBase = isBrowser ? '' : PYTHON_BACKEND_URL;
const javaBase = isBrowser ? '' : JAVA_BACKEND_URL;

/**
 * Submit a single property to the Python backend for prediction.
 * In the browser this hits the Next.js proxy at /api/estimator/predictions.
 */
export async function predictProperty(features: { [key: string]: number }): Promise<PredictionResponse> {
  const res = await fetch(`${pythonBase}/api/estimator/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Prediction failed'));
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
    throw new Error(await getErrorMessage(res, 'Failed to fetch history'));
  }
  return res.json();
}

/**
 * Compare multiple properties via the Python backend batch endpoint.
 * Sends the selected history items and receives predicted prices for each.
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
    throw new Error(await getErrorMessage(res, 'Comparison failed'));
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
    throw new Error(await getErrorMessage(res, 'Failed to fetch statistics'));
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
    throw new Error(await getErrorMessage(res, 'Filter failed'));
  }
  return res.json();
}

/**
 * Run a what-if analysis via the Java backend.
 * The Java backend forwards the features to the ML service and returns the
 * predicted price plus comparable records.
 */
export async function runWhatIf(request: WhatIfRequest): Promise<WhatIfResponse> {
  const res = await fetch(`${javaBase}/api/market/whatif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'What-if failed'));
  }
  return res.json();
}
