import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for CSV/PDF exports.
 *
 * The [type] dynamic segment must be "csv" or "pdf". The route streams the
 * file bytes back from the Java backend with the correct Content-Type and
 * Content-Disposition headers so the browser downloads the file.
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
  let res: Response;

  try {
    res = await fetch(`${backendUrl}/api/v1/market/export/${type}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[proxy] Java backend is unreachable at ${backendUrl}: ${message}`);
    return NextResponse.json(
      {
        error: 'Java backend is unreachable',
        detail: `Could not connect to ${backendUrl}. Make sure the Java backend is running and JAVA_BACKEND_URL is set correctly.`,
      },
      { status: 503 }
    );
  }

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
