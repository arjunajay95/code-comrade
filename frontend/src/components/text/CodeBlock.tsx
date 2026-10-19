"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Copy } from "lucide-react";
import { generate, parse } from "sugar-high/core";
import { lang as canonicalLanguage, languages } from "sugar-high/lang";
import { cn } from "@/lib/utils";

// Tokens come from sugar-high's tokenizer as plain nodes and are rendered as
// React spans, so the code is text and never markup (D-41). A language it does
// not know is highlighted with its default rules.
function tokenizeLines(code: string, language: string | null) {
  const name = language ? canonicalLanguage(language) : undefined;
  const config = languages.find((entry) => entry.id === name)?.config;
  return generate(parse(code, config));
}

const COPIED_FOR_MS = 2000;

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Without clipboard access, for example on a page that is not secure,
      // there is nothing to confirm.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_FOR_MS);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 font-mono text-micro text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      {/* The button's own text changes too, but a live region is what makes
          the change reliably announced. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Copied to the clipboard" : ""}
      </span>
    </>
  );
}

// The glass surface of D-41, the same wherever a code block appears: a
// translucent tinted fill, a faint grid, the top highlight and a light border
// (the code-surface class). It blurs what is behind it only where it sits over
// imagery, which the caller asks for with blur.
//
// A code block that scrolls sideways inside its own box, so a long line never
// widens the page. The box is min-w-0 and max-w-full for the same reason.
export function CodeBlock({
  code,
  language,
  header = true,
  size = "md",
  maxLines,
  decorative = false,
  blur = false,
  className,
}: {
  code: string;
  language: string | null;
  // Off for small illustrations, which also drops the copy button.
  header?: boolean;
  size?: "md" | "sm";
  // Only the first lines, for a preview.
  maxLines?: number;
  // A preview that is not part of the reading order: hidden from assistive
  // technology, ignores the pointer so a link around it still works, does not
  // scroll, and fades out at its right edge.
  decorative?: boolean;
  blur?: boolean;
  className?: string;
}) {
  const lines = tokenizeLines(code, language);
  const all = lines.length > 0 ? lines : [null];
  const rows = maxLines ? all.slice(0, maxLines) : all;

  return (
    <div
      aria-hidden={decorative || undefined}
      className={cn(
        "code-surface min-w-0 max-w-full overflow-hidden rounded-lg border text-code-foreground",
        blur && "backdrop-blur-sm",
        decorative && "pointer-events-none",
        className,
      )}
    >
      {header && (
        <div className="flex h-8 items-center justify-between gap-3 border-b px-3">
          {language ? (
            <span className="rounded-full border bg-muted/40 px-2 font-mono text-micro text-muted-foreground">
              {language}
            </span>
          ) : (
            <span />
          )}
          <CopyButton code={code} />
        </div>
      )}
      <div
        className={cn(
          decorative
            ? "overflow-hidden mask-[linear-gradient(to_right,#000_75%,transparent)]"
            : "overflow-x-auto",
        )}
        {...(decorative
          ? {}
          : {
              tabIndex: 0,
              role: "region",
              "aria-label": language ? `${language} code` : "Code",
            })}
      >
        <pre
          className={cn(
            "m-0 w-max min-w-full font-mono",
            size === "md"
              ? "py-3 text-small leading-6"
              : "py-2 text-micro leading-5",
          )}
        >
          <code className="block">
            {rows.map((line, index) => (
              <span
                key={index}
                className={cn(
                  "code-line flex",
                  size === "md" ? "min-h-6" : "min-h-5",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mr-3 shrink-0 select-none border-r pr-3 text-right text-code-gutter",
                    size === "md" ? "w-11" : "w-9",
                  )}
                >
                  {index + 1}
                </span>
                <span className="whitespace-pre pr-4">
                  {line?.children.map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      style={token.properties.style as CSSProperties}
                    >
                      {token.children.map((text) => text.value).join("")}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
