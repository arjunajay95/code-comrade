import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// An amber dot for work waiting on a reviewer, a green one for reviewed work.
// Unreviewed is the state a reviewer can act on, so its label is stronger.
export function ReviewStatus({
  status,
  reviewCount,
}: {
  status: "PENDING" | "REVIEWED";
  reviewCount: number;
}) {
  const pending = status === "PENDING";

  return (
    <Badge variant="outline" className="shrink-0 rounded-md">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          pending ? "bg-amber-500" : "bg-addition",
        )}
      />
      <span className={pending ? "text-foreground" : "text-muted-foreground"}>
        {pending
          ? "needs a review"
          : `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`}
      </span>
    </Badge>
  );
}
