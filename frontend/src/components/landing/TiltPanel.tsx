"use client";

import { useEffect, useRef, type ReactNode } from "react";

// The most the panel follows the pointer, in degrees (D-40).
const MAX_TILT = 3;

// Tilts a panel a few degrees toward the pointer while the pointer is over the
// hero, and back to rest when it leaves. The pointer sets two CSS variables,
// at most once per frame, and the transform itself is in globals.css, which
// keeps the panel's resting angle. Fine pointers only, and no listener at all
// under reduced motion, where the panel stays at its resting angle.
export function TiltPanel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const hero = element?.closest("[data-landing]");
    if (!element || !hero) return;
    const enabled = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!enabled.matches) return;

    let frame = 0;
    const set = (x: number, y: number) => {
      element.style.setProperty("--tilt-x", `${x}deg`);
      element.style.setProperty("--tilt-y", `${y}deg`);
    };
    const onMove = (event: Event) => {
      if (frame) return;
      const { clientX, clientY } = event as PointerEvent;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = element.getBoundingClientRect();
        // -1 at the panel's left or top edge, 1 at its right or bottom, in
        // the range the pointer can reach over the hero.
        const dx = (clientX - (box.left + box.width / 2)) / window.innerWidth;
        const dy = (clientY - (box.top + box.height / 2)) / window.innerHeight;
        const clamp = (value: number) => Math.max(-1, Math.min(1, value * 2));
        // The panel leans toward the pointer: rotateX tips its top toward a
        // pointer above it, rotateY turns it toward one on either side.
        set(clamp(dy) * -MAX_TILT, clamp(dx) * MAX_TILT);
      });
    };
    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      set(0, 0);
    };

    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="hero-tilt">
      {children}
    </div>
  );
}
