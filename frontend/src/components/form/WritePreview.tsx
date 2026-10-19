"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, CodeXml } from "lucide-react";
import { FormattedText } from "@/components/text/FormattedText";
import { CODE_LANGUAGES, insertCodeBlock } from "@/lib/insertCodeBlock";
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
  textareaId,
  onTextChange,
  children,
}: {
  value: string;
  maxLength: number;
  // The textarea's id, and a way to set its value through the form, so an
  // inserted block goes through registration, validation and the counter.
  textareaId: string;
  onTextChange: (next: string) => void;
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

  // Inserts a fence at the cursor, wrapping any selected text, then puts the
  // cursor inside it. The form's value is set first, so the textarea holds the
  // new text before the cursor is placed.
  const insert = (language: string | null) => {
    const textarea = document.getElementById(textareaId);
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const { selectionStart, selectionEnd } = textarea;
    const result = insertCodeBlock(
      textarea.value,
      selectionStart,
      selectionEnd,
      language,
    );
    onTextChange(result.value);
    textarea.focus();
    textarea.setSelectionRange(result.cursor, result.cursor);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
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

        {mode === "write" && (
          <Menu.Root>
            <Menu.Trigger className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-small text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted data-popup-open:text-foreground">
              <CodeXml className="size-3.5" aria-hidden />
              Insert code block
              <ChevronDown className="size-3.5" aria-hidden />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner
                side="bottom"
                align="end"
                sideOffset={4}
                className="z-50"
              >
                <Menu.Popup className="min-w-40 rounded-lg border bg-popover/90 p-1 shadow-[inset_0_1px_0_0_var(--glass-highlight)] backdrop-blur-md outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none">
                  {CODE_LANGUAGES.map((language) => (
                    <Menu.Item
                      key={language.label}
                      onClick={() => insert(language.value)}
                      className="flex h-8 cursor-default items-center rounded-md px-2 font-mono text-small outline-none select-none data-highlighted:bg-muted"
                    >
                      {language.label}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}
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
