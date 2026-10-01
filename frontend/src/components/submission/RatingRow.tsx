import { cn } from "@/lib/utils";

export const MAX_RATING = 5;

// A thin bar filled in proportion to a rating out of 5. role="img" with a
// label gives screen readers the value, since a bar made of divs has no
// meaning of its own.
function RatingBar({
  value,
  label,
  className,
}: {
  value: number | null;
  label: string;
  className?: string;
}) {
  const percent = value === null ? 0 : (value / MAX_RATING) * 100;

  return (
    <div
      role="img"
      aria-label={
        value === null
          ? `${label}: no ratings yet`
          : `${label}: ${value} out of ${MAX_RATING}`
      }
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-sm bg-muted",
        className,
      )}
    >
      <div
        className="h-full rounded-sm bg-addition"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

interface RatingRowProps {
  label: string;
  // null when nothing has been rated yet, which shows an empty bar.
  value: number | null;
  // The text beside the label, such as "4.7" or "4/5". Formatted by the
  // caller, since an average and a single rating are shown differently.
  valueText: string;
}

export function RatingRow({ label, value, valueText }: RatingRowProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {valueText}
        </span>
      </div>
      <RatingBar value={value} label={label} className="mt-1.5" />
    </div>
  );
}
