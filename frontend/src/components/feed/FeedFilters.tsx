"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTechnologies } from "@/hooks/useTechnologies";
import { cn } from "@/lib/utils";
import { useFeedStore } from "@/stores/feedStore";

// Two rows of 28px chips with a 6px gap. The collapsed list is exactly this
// tall, loading or loaded, so nothing below it shifts.
const COLLAPSED_HEIGHT = 62;

export function FeedFilters() {
  const storedSearch = useFeedStore((state) => state.search);
  const selected = useFeedStore((state) => state.technologies);
  const setSearch = useFeedStore((state) => state.setSearch);
  const toggleTechnology = useFeedStore((state) => state.toggleTechnology);
  const clearFilters = useFeedStore((state) => state.clearFilters);

  // The box updates on every keystroke. The store, and so the request, only
  // updates once typing pauses.
  const [text, setText] = useState(storedSearch);
  const debounced = useDebouncedValue(text.trim(), 300);
  useEffect(() => {
    setSearch(debounced);
  }, [debounced, setSearch]);

  const technologies = useTechnologies({ page: 1, limit: 50 });
  const hasFilters = storedSearch !== "" || selected.length > 0;

  // Selected chips first, so a chosen filter is never hidden in the collapsed
  // part. The sort is stable, so the rest stay alphabetical.
  const ordered = useMemo(
    () =>
      [...(technologies.data?.items ?? [])].sort(
        (a, b) =>
          Number(selected.includes(b.name)) - Number(selected.includes(a.name)),
      ),
    [technologies.data, selected],
  );

  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // scrollHeight is the chips' natural height, whether or not the list is
  // clipped. It decides if "Show all" is needed, and is re-measured when the
  // width changes.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () =>
      setOverflows(list.scrollHeight > COLLAPSED_HEIGHT + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [ordered.length]);

  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4 pb-2">
        <div className="flex gap-2">
          <Input
            type="search"
            aria-label="Search submissions"
            placeholder="Search submissions"
            maxLength={100}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-w-0 flex-1"
          />
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>

        <div
          ref={listRef}
          role="group"
          aria-label="Filter by technology"
          // Tabbing onto a chip in the clipped part expands the list, so
          // keyboard focus never disappears out of sight.
          onFocus={(event) => {
            const chip = event.target as HTMLElement;
            if (
              !expanded &&
              chip.offsetTop + chip.offsetHeight > COLLAPSED_HEIGHT
            )
              setExpanded(true);
          }}
          className={cn(
            "relative mt-3 flex flex-wrap content-start gap-1.5",
            !expanded && "h-[62px] overflow-hidden",
          )}
        >
          {technologies.isPending &&
            Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-7 w-16" />
            ))}

          {ordered.map((technology) => {
            const isSelected = selected.includes(technology.name);
            return (
              <button
                key={technology.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleTechnology(technology.name)}
                className={cn(
                  "inline-flex h-7 items-center rounded-md border px-2 text-xs",
                  isSelected
                    ? "border-addition/40 bg-addition/10 text-addition"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {technology.name}
              </button>
            );
          })}
        </div>

        {/* Always takes its 24px, so the button appearing after the data loads
            does not move anything below it. */}
        <div className="mt-1 h-6">
          {overflows && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {expanded ? "Show fewer" : `Show all ${ordered.length}`}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
