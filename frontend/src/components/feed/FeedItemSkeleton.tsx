// Same structure and measurements as FeedItemRow: a 24px title line, a
// 48px description area, a 24px tag line. Keeping them identical is what
// stops the page shifting when the real rows arrive.
export function FeedItemSkeleton() {
  return (
    <div className="border-b py-5 first:pt-0" aria-hidden>
      <div className="flex h-6 items-center justify-between gap-4">
        <div className="h-4 w-1/3 animate-pulse rounded-sm bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="mt-1 flex min-h-12 flex-col justify-center gap-2">
        <div className="h-3 w-full animate-pulse rounded-sm bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="mt-2 flex h-6 items-center gap-1.5">
        <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-20 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
