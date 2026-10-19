"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KarmaChipProps {
  // null while the number is loading. The chip keeps its size either way.
  value: number | null;
  size?: "md" | "sm";
  className?: string;
}

// The number sits in a fixed 16px slot. The old value is taken out of flow as
// it leaves, so the chip never changes size while the new one slides in.
// AnimatePresence has initial false, so the first render does not animate.
function KarmaNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className="font-medium text-foreground">{value}</span>;
  }

  return (
    <span className="relative inline-flex h-4 items-center overflow-hidden leading-4">
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="font-medium text-foreground"
        >
          {value}
        </m.span>
      </AnimatePresence>
    </span>
  );
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
        "inline-flex shrink-0 items-center justify-center gap-1 rounded-md border bg-muted/50 font-mono tabular-nums",
        size === "md"
          ? "h-7 min-w-12 px-2 text-micro"
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
        <KarmaNumber value={value} />
      )}
    </span>
  );
}
