"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Wraps a landing card so its border is lit near the pointer. The wrapper adds
// no size and no layout: the highlight is a ::before in globals.css, drawn
// from two CSS variables set here on pointermove (D-40). The variables are
// written at most once per frame. The effect is off for touch and for reduced
// motion, where no listener is attached at all.
export function Spotlight({
  className,
  children,
}: {
  // Carries the card's corner radius, so the highlight follows it.
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const enabled = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!enabled.matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = element.getBoundingClientRect();
        element.style.setProperty("--spot-x", `${clientX - box.left}px`);
        element.style.setProperty("--spot-y", `${clientY - box.top}px`);
      });
    };
    element.addEventListener("pointermove", onMove);
    return () => {
      element.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={cn("spotlight", className)}>
      {children}
    </div>
  );
}
