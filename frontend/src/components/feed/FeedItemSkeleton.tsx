import { Skeleton } from "@/components/ui/skeleton";

// Same rows and heights as FeedItemRow: a 24px title row, a 48px description,
// a 24px tag row, and a 37px author row, inside 20px padding and a 1px
// border, 215px in all. Keeping them identical is what stops the page
// shifting when the real cards arrive.
export function FeedItemSkeleton() {
  return (
    <div aria-hidden className="rounded-xl border bg-card/60 p-5">
      <div className="flex h-6 items-center justify-between gap-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="mt-2 flex h-12 flex-col justify-center gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mt-4 flex h-6 items-center gap-1.5">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
      <div className="mt-4 border-t pt-3">
        <div className="flex h-6 items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-9" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
