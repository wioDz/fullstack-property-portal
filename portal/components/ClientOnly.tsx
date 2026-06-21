'use client';

import { useEffect, useState } from 'react';

/**
 * Renders children only after the component has mounted on the client.
 *
 * Use this to wrap components that rely on client-only state like localStorage
 * or browser extensions that mutate the DOM to avoid React hydration mismatches.
 * During SSR the fallback is rendered; after the first client render the children
 * appear.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
