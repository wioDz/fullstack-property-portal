import { proxyGet } from '@/lib/proxy';

/**
 * Next.js API route proxy for market statistics.
 *
 * Forwards GET requests to the Java backend's /api/v1/market/statistics
 * endpoint. The result is cached on the Java side (Caffeine), but we still
 * avoid Next.js's own fetch cache layer by passing cache: 'no-store'.
 */
export async function GET() {
  const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';
  return proxyGet(`${backendUrl}/api/v1/market/statistics`, 'Java backend');
}
