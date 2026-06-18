'use client';

import { Button } from '@/components/ui/button';

/**
 * Global error boundary for unexpected errors in the App Router.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-2xl font-bold text-slate-900">Something went wrong</h2>
      <p className="text-slate-600 max-w-md text-center">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
