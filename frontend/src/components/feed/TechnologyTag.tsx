import { cn } from "@/lib/utils";

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
        "inline-flex h-6 items-center rounded-md border px-2 text-xs",
        matched
          ? "border-addition/40 bg-addition/10 text-addition"
          : "bg-muted/50 text-muted-foreground",
      )}
    >
      {name}
    </span>
  );
}
