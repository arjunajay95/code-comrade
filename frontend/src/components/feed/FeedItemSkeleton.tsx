import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Same structure and measurements as FeedItemRow. Keeping them identical is
// what stops the page shifting when the real cards arrive.
export function FeedItemSkeleton() {
  return (
    <Card className="gap-0 py-0" aria-hidden>
      <CardContent className="p-4">
        <div className="flex h-6 items-center justify-between gap-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="mt-1 flex min-h-12 flex-col justify-center gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="mt-3 flex min-h-6 items-center gap-1.5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="mt-3 h-9 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}
