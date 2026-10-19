import { Fragment } from "react";
import { parseFormattedText } from "@/lib/formattedText";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";

// Text written by users can contain a long string with no spaces, such as a
// pasted URL. overflow-wrap:anywhere lets it break instead of pushing the page
// wider than the screen.
const WRAP = "[overflow-wrap:anywhere]";

// Renders free text per D-41: paragraphs keep their line breaks, inline code is
// set in mono, and fenced code becomes a CodeBlock. Everything is rendered as
// React text, so any HTML in the input shows as plain characters. Text size
// and colour come from className, which the paragraphs inherit.
export function FormattedText({
  text,
  className,
  blurCode = false,
}: {
  text: string;
  className?: string;
  // Blur behind code blocks, for text that sits over imagery.
  blurCode?: boolean;
}) {
  const blocks = parseFormattedText(text);

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      {blocks.map((block, index) =>
        block.type === "code" ? (
          <CodeBlock
            key={index}
            code={block.code}
            language={block.language}
            blur={blurCode}
          />
        ) : (
          <p key={index} className={cn("whitespace-pre-line", WRAP)}>
            {block.segments.map((segment, segmentIndex) =>
              segment.type === "code" ? (
                <code
                  key={segmentIndex}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-small"
                >
                  {segment.value}
                </code>
              ) : (
                <Fragment key={segmentIndex}>{segment.value}</Fragment>
              ),
            )}
          </p>
        ),
      )}
    </div>
  );
}
