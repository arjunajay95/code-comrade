import type { ReactNode } from "react";
import { GitPullRequest, ListFilter, MessageSquareCode } from "lucide-react";
import { TechnologyTag } from "@/components/feed/TechnologyTag";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { Container } from "@/components/shell/Container";
import { Surface } from "@/components/shell/Surface";
import { RatingPips } from "@/components/submission/RatingPips";
import { CodeBlock } from "@/components/text/CodeBlock";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./SectionTitle";
import { Spotlight } from "./Spotlight";

// Each card ends in a small outcome, built from the app's own components at
// small sizes, in a recessed well. The well has one fixed height for all three,
// is hidden from assistive technology, ignores the pointer, and fades out at
// its bottom edge, so nothing in it can shift the card (D-36).
function Well({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none h-36 overflow-hidden rounded-xl border bg-background/50 p-3",
        "shadow-[inset_0_2px_6px_oklch(0.2_0.03_205/0.1)] dark:shadow-[inset_0_2px_6px_oklch(0.05_0.02_205/0.5)]",
        "mask-[linear-gradient(to_bottom,#000_60%,transparent)]",
      )}
    >
      {children}
    </div>
  );
}

function MiniFeedCard() {
  return (
    <Well>
      <p className="truncate text-small font-medium">Rate limiter middleware</p>
      <CodeBlock
        code={"const key = `rl:${ip}`\nawait redis.expire(key, 60)"}
        language="ts"
        header={false}
        size="sm"
        className="mt-2"
      />
      <div className="mt-2 flex h-6 gap-1.5">
        <TechnologyTag name="express" />
        <TechnologyTag name="redis" />
      </div>
    </Well>
  );
}

function MiniReview() {
  return (
    <Well>
      <div className="flex h-7 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-micro font-medium">
          L
        </span>
        <span className="min-w-0 flex-1 truncate text-small">leo_codes</span>
        <KarmaChip value={16} size="sm" />
      </div>
      <p className="mt-2 truncate text-small text-muted-foreground">
        Put the window start in the key.
      </p>
      <div className="mt-3 flex h-5 items-center justify-between gap-3 text-small">
        <span className="text-muted-foreground">Correctness</span>
        <RatingPips value={4} label="Correctness" />
      </div>
    </Well>
  );
}

const RANKED = [
  {
    title: "Rate limiter middleware",
    tags: ["express", "typescript"],
    hits: 2,
  },
  { title: "Optimistic updates hook", tags: ["react", "typescript"], hits: 2 },
  { title: "Worker pool in Go", tags: ["go", "docker"], hits: 0 },
];

function MiniRankedList() {
  return (
    <Well>
      <ol className="space-y-1">
        {RANKED.map((row, index) => (
          <li key={row.title} className="flex h-8 items-center gap-2">
            <span className="w-3 shrink-0 font-mono text-micro text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-small">
              {row.title}
            </span>
            <span className="flex shrink-0 gap-1">
              {row.tags.map((tag) => (
                <TechnologyTag key={tag} name={tag} matched={row.hits > 0} />
              ))}
            </span>
          </li>
        ))}
      </ol>
    </Well>
  );
}

const STEPS: {
  number: string;
  icon: typeof GitPullRequest;
  title: string;
  text: string;
  outcome: ReactNode;
  caption: string;
}[] = [
  {
    number: "1",
    icon: GitPullRequest,
    title: "Create a post",
    text: "Link a public GitHub repository, say what you want looked at, and choose the criteria reviewers rate.",
    outcome: <MiniFeedCard />,
    caption: "your post, in the feed",
  },
  {
    number: "2",
    icon: MessageSquareCode,
    title: "Review someone else's code",
    text: "Rate each criterion from 1 to 5 and write what you would tell the author. Every review earns you karma.",
    outcome: <MiniReview />,
    caption: "a review, and karma for writing it",
  },
  {
    number: "3",
    icon: ListFilter,
    title: "Get a feed that fits",
    text: "Add your stack, and the For you feed ranks posts by how well they match it.",
    outcome: <MiniRankedList />,
    caption: "ranked by your stack",
  },
];

export function HowItWorks() {
  return (
    // z-10 keeps this section above the hero photo, which runs 60vh into it.
    <section className="relative z-10 py-24">
      <Container size="wide" verticalPadding={false}>
        <div className="text-center md:text-left">
          <SectionTitle>How it works</SectionTitle>
          <p className="mt-3 text-body text-muted-foreground">
            Three steps, and every review you write counts.
          </p>
        </div>
        <ol className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.number} className="flex min-w-0">
                <Spotlight className="w-full min-w-0 rounded-xl">
                  <Surface
                    glass
                    className="relative flex h-full min-w-0 flex-col p-6"
                  >
                    <span
                      aria-hidden
                      className="absolute top-5 right-6 select-none font-display text-[3.5rem] leading-none text-muted-foreground"
                    >
                      {step.number}
                    </span>
                    <span
                      aria-hidden
                      className="flex size-10 items-center justify-center rounded-lg border bg-muted/50"
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-5 text-heading font-medium">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-body text-muted-foreground">
                      {step.text}
                    </p>
                    {/* mt-auto pushes the outcome and its caption to the
                        bottom, so the three line up whatever the text above
                        them runs to. */}
                    <div className="mt-auto pt-6">
                      {step.outcome}
                      <p className="mt-3 font-mono text-micro text-muted-foreground">
                        {step.caption}
                      </p>
                    </div>
                  </Surface>
                </Spotlight>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
