import { NextResponse } from 'next/server';

/**
 * Next.js API route proxy for market statistics.
 * Forwards GET requests to the Java backend.
 */
export async function GET() {
  const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';

  const res = await fetch(`${backendUrl}/api/v1/market/statistics`, {
    cache: 'no-store',
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
