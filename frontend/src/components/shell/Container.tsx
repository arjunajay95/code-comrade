import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Each page sets its own width through this component, so a page can run
// full-bleed sections without the root layout fighting it (D-40).
const SIZES = {
  reading: "max-w-3xl",
  wide: "max-w-6xl",
} as const;

interface ContainerProps {
  size: keyof typeof SIZES;
  // Off for pages that manage their own vertical rhythm.
  verticalPadding?: boolean;
  className?: string;
  children: ReactNode;
}

export function Container({
  size,
  verticalPadding = true,
  className,
  children,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        SIZES[size],
        verticalPadding && "py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
