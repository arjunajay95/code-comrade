import { cn } from "@/lib/utils";
import { MAX_RATING } from "./RatingRow";

// One reviewer's rating as five small squares, filled up to the score.
// Individual ratings are whole numbers from 1 to 5, so they map exactly onto
// discrete squares. The averages above are fractions like 4.7, which is why
// they keep the continuous green bar. A different shape and a neutral color,
// instead of the green reserved for averages, is what stops the two from
// reading as the same thing.
export function RatingPips({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label}: ${value} out of ${MAX_RATING}`}
      className="flex items-center gap-2"
    >
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: MAX_RATING }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-2.5 rounded-[2px]",
              index < value ? "bg-foreground/70" : "bg-foreground/15",
            )}
          />
        ))}
      </span>
      {/* The squares already show the value, so on the narrowest screens the
          number is dropped to give the criterion name room to fit. */}
      <span
        aria-hidden
        className="hidden w-7 text-right text-xs tabular-nums text-muted-foreground min-[380px]:inline"
      >
        {value}/{MAX_RATING}
      </span>
    </div>
  );
}
