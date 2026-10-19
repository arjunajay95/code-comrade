import { LandingActions } from "./LandingActions";

// Each line is delayed by a further 60ms. The class applies only under
// prefers-reduced-motion: no-preference, so reduced motion shows everything at
// once. The h1 has no entrance: it can be the LCP element, and an element that
// starts at zero opacity cannot be (D-40).
const ENTER = "motion-safe:animate-hero-enter";
const delay = (step: number) => ({ animationDelay: `${step * 60}ms` });

export function HeroContent() {
  return (
    <div className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
      <p
        style={delay(0)}
        className={`${ENTER} font-mono text-micro uppercase tracking-wider text-foreground md:text-muted-foreground`}
      >
        Peer code review
      </p>
      <h1 className="mt-4 font-display text-display">
        <span className="block">Review code,</span>
        <span className="block italic text-addition">get reviewed.</span>
      </h1>
      <p
        style={delay(1)}
        className={`${ENTER} mx-auto mt-6 max-w-xl text-heading text-foreground md:mx-0`}
      >
        Write reviews to earn karma, and get feedback on your own code from
        developers who know your stack.
      </p>
      <div style={delay(2)} className={`${ENTER} mt-8`}>
        <LandingActions className="justify-center md:justify-start" />
      </div>
    </div>
  );
}
