import { cn } from "@/lib/utils";

// A block-level flex box, not inline-flex. Inside an li, an inline box sits on
// the line's baseline and drops by about a pixel, which a row with a fixed
// 24px height then clips (TechnologyTagRow).
//
// A matched tag is one the signed-in user also has in their stack. It takes
// the same green as karma, since both mean "this counts toward you".
export function TechnologyTag({
  name,
  matched = false,
}: {
  name: string;
  matched?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-6 w-fit items-center rounded-md border px-2 font-mono text-micro",
        matched
          ? "border-addition/40 bg-addition/10 text-addition"
          : "bg-muted/50 text-muted-foreground",
      )}
    >
      {name}
    </span>
  );
}
