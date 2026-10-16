import { cn } from "@/lib/utils";

interface RatingInputProps {
  name: string;
  label: string;
  // 0 means nothing chosen yet.
  value: number;
  onChange: (value: number) => void;
}

const SCORES = [1, 2, 3, 4, 5] as const;

// Five native radio buttons, so arrow keys and screen readers work with no
// extra code. The input is visually hidden and its label is the visible
// square, filled up to the chosen score like the pips on a posted review.
export function RatingInput({
  name,
  label,
  value,
  onChange,
}: RatingInputProps) {
  return (
    <div
      role="radiogroup"
      aria-label={`${label}, rating from 1 to 5`}
      className="flex gap-1.5"
    >
      {SCORES.map((score) => (
        <label
          key={score}
          className={cn(
            "flex size-7 cursor-pointer items-center justify-center rounded-md border text-xs tabular-nums transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
            "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
            score <= value
              ? "border-addition/40 bg-addition/10 text-addition"
              : "bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
        >
          <input
            type="radio"
            name={name}
            value={score}
            checked={value === score}
            onChange={() => onChange(score)}
            className="sr-only"
          />
          {score}
        </label>
      ))}
    </div>
  );
}
