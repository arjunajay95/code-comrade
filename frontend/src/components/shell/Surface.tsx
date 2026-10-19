import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// The card surface of D-40: one bordered layer. Interactive surfaces carry a
// stretched link (an ::after on the link with data-card-link), so the whole
// card is the click target and a keyboard focus on that link rings the card.
export function Surface({
  interactive = false,
  className,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/60 p-5",
        interactive &&
          "relative transition-colors hover:border-foreground/20 hover:bg-card has-[[data-card-link]:focus-visible]:ring-2 has-[[data-card-link]:focus-visible]:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

export const STRETCHED_LINK =
  "underline-offset-4 outline-none after:absolute after:inset-0 hover:underline";
