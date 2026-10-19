import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// The glass treatment of D-40: a translucent fill, a fine highlight along the
// top edge (an inset shadow, so it takes no space), and a light border.
// Highlight values are themed in globals.css.
export const GLASS_HIGHLIGHT =
  "shadow-[inset_0_1px_0_0_var(--glass-highlight)]";

// Backdrop blur is for surfaces that sit over imagery or content: the landing
// page, menus and dialogs. App cards have none, to keep scrolling and INP light.
export const GLASS_BLUR = "backdrop-blur-md";

// The card surface. Interactive surfaces carry a stretched link (an ::after on
// the link with data-card-link), so the whole card is the click target and a
// keyboard focus on that link rings the card. The glass prop adds the blur
// and a more translucent fill.
export function Surface({
  interactive = false,
  glass = false,
  className,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean; glass?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/60 p-5",
        GLASS_HIGHLIGHT,
        glass && cn("bg-card/30", GLASS_BLUR),
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
