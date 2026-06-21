import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/proxy';

/**
 * Next.js API route proxy for creating a single property prediction.
 *
 * Why a proxy? The browser cannot directly call the Python backend during
 * local development (different port) and in production we want a single
 * origin. This route forwards the request to the Python backend's
 * /api/v1/predictions endpoint and returns the result.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8002';
  const body = await request.json();
  return proxyPost(`${backendUrl}/api/v1/predictions`, body, 'Python backend');
}
