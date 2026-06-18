import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for filtering market records.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';
  const body = await request.json();

  const res = await fetch(`${backendUrl}/api/v1/market/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
