import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for CSV/PDF exports.
 * The [type] segment must be "csv" or "pdf".
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (type !== 'csv' && type !== 'pdf') {
    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
  }

  const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';
  const res = await fetch(`${backendUrl}/api/v1/market/export/${type}`);

  const contentType = type === 'csv' ? 'text/csv' : 'application/pdf';
  const extension = type === 'csv' ? 'csv' : 'pdf';
  const blob = await res.blob();

  return new NextResponse(blob, {
    status: res.status,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="market_report.${extension}"`,
    },
  });
}
