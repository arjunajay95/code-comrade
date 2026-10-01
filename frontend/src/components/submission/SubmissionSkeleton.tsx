import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// The same three-card shape as the loaded page, so it does not jump when the
// data arrives.
export function SubmissionSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading submission">
      <Card className="gap-0 py-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          <div className="mt-3 flex gap-1.5">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="mt-4 h-9 w-40" />
          <Skeleton className="mt-4 h-9 w-full rounded-lg" />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="space-y-2 p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
