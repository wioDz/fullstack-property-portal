import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/proxy';

/**
 * Next.js API route proxy for filtering market records.
 *
 * Forwards the filter/sort criteria to the Java backend's
 * /api/v1/market/filter endpoint and returns the matching HouseRecords.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';
  const body = await request.json();
  return proxyPost(`${backendUrl}/api/v1/market/filter`, body, 'Java backend');
}
