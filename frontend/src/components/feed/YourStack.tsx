"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { useUiStore } from "@/stores/uiStore";
import { TechnologyTag } from "./TechnologyTag";

// The signed-in user's stack, above the filters on For you. Its tags use the
// matched style, since they are what the feed is matched against. The title
// row and button are fixed-height, and the chips wrap inside a box that is
// reserved while loading, so nothing below moves (D-36).
export function YourStack() {
  const me = useMe();
  const openStackPicker = useUiStore((state) => state.openStackPicker);
  const technologies = me.data?.technologies;
  const hasNoStack = technologies?.length === 0;

  return (
    <section aria-labelledby="your-stack-heading" className="mb-6">
      <h2
        id="your-stack-heading"
        className="mb-3 text-micro uppercase tracking-wider text-muted-foreground"
      >
        Your stack
      </h2>

      {technologies === undefined ? (
        <div aria-hidden className="flex flex-wrap gap-1.5">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-16" />
          ))}
        </div>
      ) : hasNoStack ? (
        <p className="text-small text-muted-foreground">
          You have not added any technologies yet, so this feed is ordered by
          recency.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {technologies.map((technology) => (
            <li key={technology.id}>
              <TechnologyTag name={technology.name} matched />
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={openStackPicker}
      >
        {hasNoStack ? "Add your technologies" : "Edit stack"}
      </Button>

      {technologies !== undefined && !hasNoStack && (
        <p className="mt-3 text-small text-muted-foreground">
          Posts are ranked by how well they match your stack and how recent they
          are.
        </p>
      )}
    </section>
  );
}
