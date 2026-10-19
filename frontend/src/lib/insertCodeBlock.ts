// The languages the Write tab offers (D-41). The value is what goes after the
// opening backticks, and null is a fence with no language.
export const CODE_LANGUAGES: { label: string; value: string | null }[] = [
  { label: "ts", value: "ts" },
  { label: "tsx", value: "tsx" },
  { label: "js", value: "js" },
  { label: "jsx", value: "jsx" },
  { label: "py", value: "py" },
  { label: "go", value: "go" },
  { label: "java", value: "java" },
  { label: "rust", value: "rust" },
  { label: "sql", value: "sql" },
  { label: "json", value: "json" },
  { label: "bash", value: "bash" },
  { label: "css", value: "css" },
  { label: "html", value: "html" },
  { label: "plain text", value: null },
];

// Puts a fenced block into text at a selection. Selected text is wrapped by
// the fence, and the cursor lands inside it: on the empty line when nothing
// was selected, after the wrapped text otherwise. A fence always starts at the
// beginning of a line, so a newline is added before or after it when needed.
export function insertCodeBlock(
  value: string,
  start: number,
  end: number,
  language: string | null,
): { value: string; cursor: number } {
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  const lead = before === "" || before.endsWith("\n") ? "" : "\n";
  const open = "```" + (language ?? "") + "\n";
  const trail = after === "" || after.startsWith("\n") ? "" : "\n";

  return {
    value: before + lead + open + selected + "\n```" + trail + after,
    cursor: before.length + lead.length + open.length + selected.length,
  };
}
