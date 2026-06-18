import { NextResponse } from 'next/server';

/**
 * Next.js API route proxy for the prediction history endpoint.
 */
export async function GET() {
  const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8002';

  const res = await fetch(`${backendUrl}/api/v1/predictions/history`, {
    cache: 'no-store',
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
