import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KarmaChipProps {
  // null while the number is loading. The chip keeps its size either way.
  value: number | null;
  size?: "md" | "sm";
  className?: string;
}

// Karma as a lightning bolt and a number. One component, so the header and
// every feed row show it identically.
export function KarmaChip({ value, size = "md", className }: KarmaChipProps) {
  return (
    <span
      role="img"
      title="Karma, earned by reviewing other people's code"
      aria-label={value === null ? "Loading karma" : `${value} karma`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded-md border bg-muted/50 tabular-nums",
        size === "md"
          ? "h-7 min-w-12 px-2 text-xs"
          : "h-5 min-w-9 px-1.5 text-[11px]",
        className,
      )}
    >
      {/* fill-current fills the bolt with the icon's color, instead of leaving
          just an outline. */}
      <Zap
        className={cn(
          "fill-current text-addition",
          size === "md" ? "size-3.5" : "size-3",
        )}
        aria-hidden
      />
      {value === null ? (
        <Skeleton className="h-3 w-4" />
      ) : (
        <span className="font-medium text-foreground">{value}</span>
      )}
    </span>
  );
}
