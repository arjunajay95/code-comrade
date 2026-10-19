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
          "group/card relative transition-[color,background-color,border-color,translate] hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-card motion-reduce:hover:translate-y-0 has-[[data-card-link]:focus-visible]:ring-2 has-[[data-card-link]:focus-visible]:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

// The title's underline is a 1px line, drawn in from the left when the card
// (the group/card ancestor) is hovered or the link has keyboard focus. It is a
// background, so it moves no layout, and it appears at once under reduced
// motion.
export const STRETCHED_LINK =
  "bg-linear-to-r from-foreground/40 to-foreground/40 bg-size-[0%_1px] bg-bottom-left bg-no-repeat outline-none transition-[background-size] duration-250 ease-out after:absolute after:inset-0 group-hover/card:bg-size-[100%_1px] focus-visible:bg-size-[100%_1px] motion-reduce:transition-none";
