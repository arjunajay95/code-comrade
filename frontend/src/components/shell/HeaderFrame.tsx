"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// The header is h-14.
const HEADER_HEIGHT = 56;

// On the landing page in dark, the hero runs under the header. The header
// reports whether it is still clear of the hero text through data-over-hero,
// and the styles below change colours only, never size or position (D-36). The
// value starts true on / so the first paint is already right. A sentinel at
// the top of the hero text turns it off once the text scrolls up to the
// header, and the blur then fades in over 300ms. That is a transition fired
// at one point, not an effect tied to the scroll position (D-40).
export function HeaderFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pastHero, setPastHero] = useState(false);
  const overHero = pathname === "/" && !pastHero;

  useEffect(() => {
    if (pathname !== "/") return;
    const sentinel = document.querySelector("[data-hero-sentinel]");
    if (!sentinel) return;

    // The root stops at the header's bottom edge, so the callback fires when
    // the sentinel crosses it.
    const observer = new IntersectionObserver(
      (changes) => {
        const latest = changes[changes.length - 1];
        setPastHero(latest.boundingClientRect.top <= HEADER_HEIGHT);
      },
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header
      data-over-hero={overHero}
      className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur transition-[background-color,border-color,backdrop-filter] duration-300 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[calc(100%+2.5rem)] before:bg-linear-to-b before:from-background/40 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 dark:data-[over-hero=true]:border-transparent dark:data-[over-hero=true]:bg-transparent dark:data-[over-hero=true]:backdrop-blur-[0px] dark:data-[over-hero=true]:before:opacity-100"
    >
      {children}
    </header>
  );
}
