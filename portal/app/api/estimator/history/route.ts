import { proxyGet } from '@/lib/proxy';

/**
 * Next.js API route proxy for the prediction history endpoint.
 *
 * Returns the list of predictions stored in the Python backend's in-memory
 * history. Uses cache: 'no-store' so the portal always shows the latest history.
 */
export async function GET() {
  const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8002';
  return proxyGet(`${backendUrl}/api/v1/predictions/history`, 'Python backend');
}
