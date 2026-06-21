import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/proxy';

/**
 * Next.js API route proxy for what-if analysis.
 *
 * Forwards a hypothetical property's features to the Java backend's
 * /api/v1/market/whatif endpoint. The Java backend calls the ML service,
 * computes the predicted price, and returns comparable properties.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';
  const body = await request.json();
  return proxyPost(`${backendUrl}/api/v1/market/whatif`, body, 'Java backend');
}
