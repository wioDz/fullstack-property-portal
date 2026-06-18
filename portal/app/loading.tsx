/**
 * Global loading UI shown while route segments are loading.
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
