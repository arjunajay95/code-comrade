import { Surface } from "@/components/shell/Surface";
import { Skeleton } from "@/components/ui/skeleton";

// The same structure as SubmissionView, row for row: a 34px title line, a 20px
// meta line, a two-line 48px description, a 24px tag line and a 28px actions
// row, closed by a hairline with 32px below it. A title, a description or a
// criteria list that runs longer than one of these rows grows past it, which
// no skeleton can predict. Three criteria are shown, the middle of 1 to 5.
export function SubmissionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading submission">
      <div className="border-b pb-8">
        <div className="flex h-8.5 items-center">
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="mt-3 flex h-5 items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-9" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="mt-4 flex h-12 flex-col justify-center gap-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        <div className="mt-4 flex h-6 items-center gap-1.5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="mt-6 h-7 w-40" />
      </div>

      <div className="mt-8">
        <Surface>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <div className="mt-4 space-y-4 rounded-lg bg-muted/50 p-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-8">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-1.5 w-full" />
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
