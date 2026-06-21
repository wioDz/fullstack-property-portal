/**
 * Shared proxy helpers for Next.js API route handlers.
 *
 * These functions wrap `fetch` calls to the Python and Java backends and
 * convert network failures into informative HTTP responses so the browser
 * gets a clear error message instead of a generic 500.
 */

import { NextResponse } from 'next/server';

/**
 * Forward a request to a backend and return a NextResponse.
 *
 * @param url Full backend URL
 * @param init Fetch init options
 * @param serviceName Human-readable backend name for error messages
 */
export async function proxyToBackend(
  url: string,
  init: RequestInit,
  serviceName: string
): Promise<NextResponse> {
  let res: Response;

  try {
    res = await fetch(url, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[proxy] ${serviceName} is unreachable at ${url}: ${message}`);
    return NextResponse.json(
      {
        error: `${serviceName} is unreachable`,
        detail: `Could not connect to ${url}. Make sure the service is running and the environment variable (e.g. ${serviceName === 'Java backend' ? 'JAVA_BACKEND_URL' : 'PYTHON_BACKEND_URL'}) is set correctly.`,
      },
      { status: 503 }
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    // If the response is not JSON (e.g. an HTML error page), return the text.
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}

/**
 * Proxy a GET request to a backend.
 */
export async function proxyGet(url: string, serviceName: string): Promise<NextResponse> {
  return proxyToBackend(url, { cache: 'no-store' }, serviceName);
}

/**
 * Proxy a POST request with a JSON body to a backend.
 */
export async function proxyPost(url: string, body: unknown, serviceName: string): Promise<NextResponse> {
  return proxyToBackend(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    serviceName
  );
}
