"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { LandingActions } from "./LandingActions";

const STAGGER_SECONDS = 0.06;

// The eyebrow, the paragraph and the actions rise 4px as they fade in, one
// after the other. The h1 never animates: it can be the LCP element, and an
// element that starts at zero opacity cannot be (D-40).
export function HeroContent() {
  const reduceMotion = useReducedMotion();

  const enter = (step: number) => ({
    initial: reduceMotion ? (false as const) : { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
      delay: step * STAGGER_SECONDS,
    },
  });

  return (
    <div className="max-w-2xl">
      <m.p
        {...enter(0)}
        className="font-mono text-micro uppercase tracking-wider text-muted-foreground"
      >
        Peer code review
      </m.p>
      <h1 className="mt-4 font-display text-display">
        <span className="block">Review code,</span>
        <span className="block italic text-addition">get reviewed.</span>
      </h1>
      <m.p
        {...enter(1)}
        className="mt-6 max-w-xl text-heading text-muted-foreground"
      >
        Write reviews to earn karma, and get feedback on your own code from
        developers who know your stack.
      </m.p>
      <m.div {...enter(2)} className="mt-8">
        <LandingActions />
      </m.div>
    </div>
  );
}
