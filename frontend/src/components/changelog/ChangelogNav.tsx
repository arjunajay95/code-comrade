"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavYear {
  year: string;
  months: {
    // YYYY-MM, matched against data-month on each entry.
    key: string;
    label: string;
    // The id of the month's first entry, which the link jumps to.
    entryId: string;
  }[];
}

// Years and months as a plain list of anchor links, so it works with no
// JavaScript. With it, the month whose entry is in view is highlighted.
export function ChangelogNav({ years }: { years: NavYear[] }) {
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  useEffect(() => {
    const entries = Array.from(
      document.querySelectorAll<HTMLElement>("[data-changelog-entry]"),
    );
    if (entries.length === 0) return;

    const visible = new Set<Element>();
    // A band just under the sticky header and above the lower half of the
    // screen, so the entry being read is the one that counts.
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          if (change.isIntersecting) visible.add(change.target);
          else visible.delete(change.target);
        }
        const current = entries.find((entry) => visible.has(entry));
        if (current) setActiveMonth(current.dataset.month ?? null);
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );
    entries.forEach((entry) => observer.observe(entry));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Changelog months" className="space-y-5">
      {years.map(({ year, months }) => (
        <div key={year}>
          <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
            {year}
          </p>
          <ul className="mt-2 space-y-1">
            {months.map((month) => {
              const current = month.key === activeMonth;
              return (
                <li key={month.key}>
                  <a
                    href={`#${month.entryId}`}
                    aria-current={current ? "location" : undefined}
                    className={cn(
                      "block rounded-md px-2 py-1 text-small outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      current
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {month.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
