import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for the Python backend estimator endpoints.
 * Forwards POST requests to create a new prediction.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8002';
  const body = await request.json();

  const res = await fetch(`${backendUrl}/api/v1/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
