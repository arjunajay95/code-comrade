import { Surface } from "@/components/shell/Surface";
import { RatingPips } from "@/components/submission/RatingPips";
import { HERO_REVIEW, type DiffLineKind } from "@/content/landingHero";
import { cn } from "@/lib/utils";
import { Spotlight } from "./Spotlight";

const ROW: Record<DiffLineKind, string> = {
  context: "text-muted-foreground",
  removed: "bg-destructive/10 text-foreground/80",
  added: "bg-addition/10 text-foreground",
};

const MARKER: Record<DiffLineKind, { text: string; className: string }> = {
  context: { text: " ", className: "" },
  removed: { text: "-", className: "text-destructive" },
  added: { text: "+", className: "text-addition" },
};

// A decorative review card for the hero's upper right, from xl only. It is
// static and cannot be reached: aria-hidden, an inert card, no links. The wrapper has
// the dark class, so its tokens are the dark ones in both themes, as in the
// rest of the hero. It sits 4rem from the right edge, clear of the vertical
// photo credit, and its 26rem keeps it to the right of the hero text from
// 1280px up, where that text ends at about 760px.
export function HeroReviewCard() {
  const { path, lines, comment, rating } = HERO_REVIEW;

  return (
    <div
      aria-hidden
      className="dark absolute top-8 right-16 z-10 hidden w-[26rem] select-none xl:block dark:top-24"
    >
      {/* The spotlight listens on the wrapper, and the card inside is inert.
          Pointer events pass through inert content to the element behind it,
          so the wrapper still sees the pointer while nothing inside can be
          focused or clicked. */}
      <Spotlight className="rounded-xl">
        <Surface inert glass className="p-0 text-foreground">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <span className="min-w-0 truncate font-mono text-micro text-muted-foreground">
              {path}
            </span>
            <span className="shrink-0 rounded-full border px-2 font-mono text-micro text-muted-foreground">
              Review
            </span>
          </div>

          <ol className="py-2 font-mono text-micro">
            {lines.map((line) => (
              <li
                key={`${line.number}-${line.kind}`}
                className={cn(
                  "flex h-6 items-center gap-3 px-4",
                  ROW[line.kind],
                )}
              >
                <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">
                  {line.number}
                </span>
                <span
                  className={cn(
                    "w-2 shrink-0 text-center",
                    MARKER[line.kind].className,
                  )}
                >
                  {MARKER[line.kind].text}
                </span>
                <span className="min-w-0 truncate whitespace-pre">
                  {line.code}
                </span>
              </li>
            ))}
          </ol>

          <div className="border-t px-4 py-3">
            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-micro font-medium">
                {comment.author.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-small font-medium">{comment.author}</p>
                <p className="mt-0.5 text-small text-foreground/80">
                  {comment.text}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-small">
            <span className="text-muted-foreground">{rating.label}</span>
            <RatingPips value={rating.value} label={rating.label} />
          </div>
        </Surface>
      </Spotlight>
    </div>
  );
}
