import { flushSync } from "react-dom";

const DURATION_MS = 400;

// Switches the theme as a circle growing from the toggle (D-40). The new theme
// is applied inside document.startViewTransition, with flushSync so the page is
// already in its new state when the browser takes the "after" snapshot. Where
// the API is missing, or reduced motion is on, the theme switches at once.
export function switchTheme(
  setTheme: (theme: string) => void,
  next: string,
  origin: HTMLElement,
) {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (!document.startViewTransition || reduceMotion) {
    setTheme(next);
    return;
  }

  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  // Far enough to cover the page from the toggle's centre, wherever it is.
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(() => {
    flushSync(() => setTheme(next));
  });

  void transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: DURATION_MS,
        easing: "ease-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
}
