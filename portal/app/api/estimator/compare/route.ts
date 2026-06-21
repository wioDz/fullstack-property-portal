import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/proxy';

/**
 * Next.js API route proxy for the batch comparison endpoint.
 *
 * Receives a list of property feature sets from the portal, forwards them to
 * the Python backend's /api/v1/predictions/compare endpoint, and returns the
 * predicted prices for side-by-side comparison.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8002';
  const body = await request.json();
  return proxyPost(`${backendUrl}/api/v1/predictions/compare`, body, 'Python backend');
}
