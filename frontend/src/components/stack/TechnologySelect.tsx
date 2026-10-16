"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTechnologies } from "@/hooks/useTechnologies";
import { cn } from "@/lib/utils";

// The longest technology name the API accepts.
const MAX_NAME_LENGTH = 40;

const SELECTED_CHIP = "border-addition/40 bg-addition/10 text-addition";

interface TechnologySelectProps {
  value: string[];
  onChange: (names: string[]) => void;
  // The API's limit for the field this fills: 20 for a stack, 8 for a
  // submission.
  max: number;
  label: string;
  inputId?: string;
}

// Picks technology names: the picks on top, suggestions from
// GET /technologies?search= below, and free entry for a name with no match.
// Shared by the stack picker and the submission form.
export function TechnologySelect({
  value: selected,
  onChange,
  max,
  label,
  inputId,
}: TechnologySelectProps) {
  const [text, setText] = useState("");

  // Names are stored trimmed and lowercase (D-17), so the box is normalized
  // the same way. The API does it again, so this only keeps what the user
  // sees identical to what is saved.
  const term = text.trim().toLowerCase();
  const debounced = useDebouncedValue(term, 250);
  const technologies = useTechnologies({
    page: 1,
    limit: 20,
    search: debounced || undefined,
  });
  const results = technologies.data?.items ?? [];

  const atLimit = selected.length >= max;
  // Offered only once the results for exactly this text have arrived, so the
  // chip never flashes up for a name that turns out to exist.
  const canAddNew =
    term.length > 0 &&
    term.length <= MAX_NAME_LENGTH &&
    !selected.includes(term) &&
    technologies.isSuccess &&
    debounced === term &&
    !results.some((technology) => technology.name === term);

  const add = (name: string) => {
    if (
      !name ||
      name.length > MAX_NAME_LENGTH ||
      atLimit ||
      selected.includes(name)
    )
      return;
    onChange([...selected, name]);
    setText("");
  };
  const remove = (name: string) =>
    onChange(selected.filter((existing) => existing !== name));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          {label}{" "}
          <span className="tabular-nums">
            ({selected.length}/{max})
          </span>
        </p>
        <ul
          className="mt-2 flex min-h-7 flex-wrap gap-1.5"
          aria-label="Selected technologies"
        >
          {selected.length === 0 && (
            <li className="text-xs text-muted-foreground">
              Nothing selected yet.
            </li>
          )}
          {selected.map((name) => (
            <li key={name}>
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => remove(name)}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs",
                  SELECTED_CHIP,
                )}
              >
                {name}
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Input
          id={inputId}
          aria-label="Search or add a technology"
          placeholder="Search or add a technology"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter adds the name instead of submitting the form around it.
            if (event.key === "Enter") {
              event.preventDefault();
              add(term);
            }
          }}
        />

        {/* Two rows of chips, always. The area keeps that height while the
            suggestions load, so the controls below never jump. */}
        <div className="mt-3 flex min-h-[62px] flex-wrap content-start gap-1.5">
          {technologies.isPending &&
            Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-7 w-16" />
            ))}

          {results.map((technology) => {
            const isSelected = selected.includes(technology.name);
            return (
              <button
                key={technology.id}
                type="button"
                aria-pressed={isSelected}
                disabled={!isSelected && atLimit}
                onClick={() =>
                  isSelected ? remove(technology.name) : add(technology.name)
                }
                className={cn(
                  "inline-flex h-7 items-center rounded-md border px-2 text-xs disabled:opacity-50",
                  isSelected
                    ? SELECTED_CHIP
                    : "bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {technology.name}
              </button>
            );
          })}

          {canAddNew && (
            <button
              type="button"
              disabled={atLimit}
              onClick={() => add(term)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed px-2 text-xs text-foreground disabled:opacity-50"
            >
              <Plus className="size-3" aria-hidden />
              Add &quot;{term}&quot;
            </button>
          )}
        </div>

        {technologies.isError && (
          <p className="mt-2 text-xs text-muted-foreground">
            Could not load suggestions. You can still type a name and press
            Enter.
          </p>
        )}
        {atLimit && (
          <p className="mt-2 text-xs text-muted-foreground">
            You have reached the limit of {max}. Remove one to add another.
          </p>
        )}
      </div>
    </div>
  );
}
