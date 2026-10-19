import { cn } from "@/lib/utils";
import { TechnologyTag } from "./TechnologyTag";

const MAX_TAGS = 3;

// One fixed line of at most three tags and a +N chip for the rest. Matched
// tags come first, so a match is never hidden behind the chip. The sort is
// stable, so the others keep the API's order. The line is 24px tall whatever
// the tags hold, which is what lets skeletons match it.
export function TechnologyTagRow({
  technologies,
  matchedNames,
  className,
}: {
  technologies: { id: number; name: string }[];
  matchedNames?: ReadonlySet<string>;
  className?: string;
}) {
  const isMatched = (name: string) => matchedNames?.has(name) ?? false;
  const tags = [...technologies].sort(
    (a, b) => Number(isMatched(b.name)) - Number(isMatched(a.name)),
  );
  const hiddenCount = tags.length - MAX_TAGS;

  return (
    <ul className={cn("flex h-6 gap-1.5 overflow-hidden", className)}>
      {tags.slice(0, MAX_TAGS).map((technology) => (
        <li key={technology.id} className="shrink-0">
          <TechnologyTag
            name={technology.name}
            matched={isMatched(technology.name)}
          />
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className="shrink-0">
          <TechnologyTag name={`+${hiddenCount}`} />
        </li>
      )}
    </ul>
  );
}
