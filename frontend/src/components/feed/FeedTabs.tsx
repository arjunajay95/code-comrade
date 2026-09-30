"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { FeedView } from "@/stores/feedStore";

const TABS: { id: FeedView; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "for-you", label: "For you" },
];

export function FeedTabs({
  view,
  onChange,
}: {
  view: FeedView;
  onChange: (view: FeedView) => void;
}) {
  const refs = useRef<Record<FeedView, HTMLButtonElement | null>>({
    latest: null,
    "for-you": null,
  });

  // With two tabs, either arrow key moves to the other one.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: FeedView = view === "latest" ? "for-you" : "latest";
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Feed"
      className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1"
      onKeyDown={onKeyDown}
    >
      {TABS.map((tab) => {
        const selected = tab.id === view;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            id={`feed-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="feed-panel"
            // Only the selected tab is in the Tab key order. Arrow keys move
            // between the tabs, as the ARIA tab pattern expects.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "h-7 rounded-md px-3 text-sm transition-colors",
              selected
                ? "bg-background text-foreground ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
