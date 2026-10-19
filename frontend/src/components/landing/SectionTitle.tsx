import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// The serif section title of the public pages. The type scale's title size is
// 1.75rem; from md it grows to 2.5rem with a line height to match.
export function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-display text-title md:text-[2.5rem] md:leading-[1.15]",
        className,
      )}
      {...props}
    />
  );
}
