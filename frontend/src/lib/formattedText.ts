// The two pieces of formatting free text supports (D-41): fenced code blocks
// and inline code. Everything else is plain text. The parser only splits the
// text into blocks. It never produces HTML, so rendering the result as React
// text keeps any markup in the input inert.

export type InlineSegment =
  { type: "text"; value: string } | { type: "code"; value: string };

export type Block =
  | { type: "paragraph"; segments: InlineSegment[] }
  | { type: "code"; language: string | null; code: string };

// A line of three or more backticks, then an optional info string.
const FENCE_OPEN = /^ {0,3}(`{3,})([^`]*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,})\s*$/;
// The language is the first word of the info string, and only a plain word.
const LANGUAGE = /^[A-Za-z0-9_+#.-]{1,20}$/;
// One pair of backticks on one line, with something between them.
const INLINE_CODE = /`([^`\n]+)`/g;

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_CODE)) {
    if (match.index > last) {
      segments.push({ type: "text", value: text.slice(last, match.index) });
    }
    segments.push({ type: "code", value: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return segments;
}

function paragraphFrom(lines: string[]): Block | null {
  // Blank lines at either end are layout, not content.
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  if (start === end) return null;
  return {
    type: "paragraph",
    segments: parseInline(lines.slice(start, end).join("\n")),
  };
}

export function parseFormattedText(input: string): Block[] {
  const blocks: Block[] = [];
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  let pending: string[] = [];

  const flush = () => {
    const paragraph = paragraphFrom(pending);
    if (paragraph) blocks.push(paragraph);
    pending = [];
  };

  for (let index = 0; index < lines.length; index++) {
    const open = FENCE_OPEN.exec(lines[index]);
    if (!open) {
      pending.push(lines[index]);
      continue;
    }

    flush();
    const fenceLength = open[1].length;
    const word = open[2].trim().split(/\s+/)[0] ?? "";
    const language = LANGUAGE.test(word) ? word.toLowerCase() : null;

    // The block runs to a line of at least as many backticks, or to the end of
    // the text when the fence is never closed.
    const body: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const close = FENCE_CLOSE.exec(lines[cursor]);
      if (close && close[1].length >= fenceLength) break;
      body.push(lines[cursor]);
      cursor++;
    }
    blocks.push({ type: "code", language, code: body.join("\n") });
    index = cursor;
  }

  flush();
  return blocks;
}

export function hasCode(input: string): boolean {
  return parseFormattedText(input).some((block) => block.type === "code");
}

// Plain text for a preview: code blocks removed, inline backticks dropped but
// their text kept, whitespace collapsed. If only code is left, the first line
// of the first code block stands in for it.
export function excerpt(input: string): string {
  const blocks = parseFormattedText(input);
  const text = blocks
    .flatMap((block) =>
      block.type === "paragraph"
        ? [block.segments.map((segment) => segment.value).join("")]
        : [],
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (text) return text;

  for (const block of blocks) {
    if (block.type !== "code") continue;
    const first = block.code.split("\n").find((line) => line.trim() !== "");
    if (first) return first.trim();
  }
  return "";
}
