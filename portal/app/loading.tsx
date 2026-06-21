import { Skeleton } from '@/components/ui/skeleton';

/**
 * Global loading UI shown while route segments are loading.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
