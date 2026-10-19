"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FormattedText } from "@/components/text/FormattedText";
import { cn } from "@/lib/utils";

type Mode = "write" | "preview";

const TABS: { id: Mode; label: string }[] = [
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
];

// A Write and Preview pair above a textarea, in the look of the feed tabs. The
// textarea stays mounted while Preview shows, only hidden, so the form keeps
// its value, its registration and its validation exactly as before. Preview
// renders the same FormattedText the page will show (D-41).
export function WritePreview({
  value,
  maxLength,
  children,
}: {
  value: string;
  maxLength: number;
  // The textarea.
  children: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("write");
  const id = useId();
  const refs = useRef<Record<Mode, HTMLButtonElement | null>>({
    write: null,
    preview: null,
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Mode = mode === "write" ? "preview" : "write";
    setMode(next);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Write or preview"
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1"
        onKeyDown={onKeyDown}
      >
        {TABS.map((tab) => {
          const selected = tab.id === mode;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                refs.current[tab.id] = element;
              }}
              id={`${id}-${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setMode(tab.id)}
              className={cn(
                "h-7 rounded-md px-3 text-small outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
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

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${mode}-tab`}
        className="mt-2"
      >
        <div className={mode === "write" ? undefined : "hidden"}>
          {children}
        </div>
        {mode === "preview" && (
          <div className="min-h-20 rounded-md border bg-input/20 px-3 py-2 dark:bg-input/30">
            {value.trim() ? (
              <FormattedText text={value} className="text-body" />
            ) : (
              <p className="text-small text-muted-foreground">
                Nothing to preview yet.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-start justify-between gap-4">
        <p className="text-small text-muted-foreground">
          Wrap code in three backticks to format it, and add a language after
          the opening backticks, like ts.
        </p>
        <span
          className={cn(
            "shrink-0 font-mono text-micro tabular-nums",
            value.length > maxLength
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
