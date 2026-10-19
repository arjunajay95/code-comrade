import type { ReactNode } from "react";
import { GitPullRequest, ListFilter, MessageSquareCode } from "lucide-react";
import { TechnologyTag } from "@/components/feed/TechnologyTag";
import { TechnologyTagRow } from "@/components/feed/TechnologyTagRow";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { Container } from "@/components/shell/Container";
import { Surface } from "@/components/shell/Surface";
import { RatingPips } from "@/components/submission/RatingPips";
import { Spotlight } from "./Spotlight";
import { SectionTitle } from "./SectionTitle";

// Small illustrations built from the app's own components. They are
// decoration, so they are hidden from assistive technology, and each has a
// fixed height so the cards do not shift as the page loads (D-36).
function PostIllustration() {
  return (
    <div aria-hidden className="h-18">
      <div className="flex h-9 items-center rounded-md border bg-input/20 px-3 font-mono text-micro text-muted-foreground dark:bg-input/30">
        github.com/mira/rate-limiter
      </div>
      <div className="mt-3 flex h-6 gap-1.5">
        <TechnologyTag name="readability" />
        <TechnologyTag name="edge cases" />
      </div>
    </div>
  );
}

function ReviewIllustration() {
  const rows = [
    { label: "Readability", value: 4 },
    { label: "Edge cases", value: 3 },
  ];
  return (
    <div aria-hidden className="flex h-12 items-center justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex h-5 items-center justify-between gap-3 text-small"
          >
            <span className="truncate text-muted-foreground">{row.label}</span>
            <RatingPips value={row.value} label={row.label} />
          </div>
        ))}
      </div>
      <KarmaChip value={16} />
    </div>
  );
}

function FeedIllustration() {
  return (
    <div aria-hidden className="h-6">
      <TechnologyTagRow
        technologies={[
          { id: 1, name: "react" },
          { id: 2, name: "typescript" },
          { id: 3, name: "go" },
        ]}
        matchedNames={new Set(["react", "typescript"])}
      />
    </div>
  );
}

const STEPS: {
  number: string;
  icon: typeof GitPullRequest;
  title: string;
  text: string;
  illustration: ReactNode;
}[] = [
  {
    number: "01",
    icon: GitPullRequest,
    title: "Post a request",
    text: "Link a public GitHub repository, say what you want looked at, and choose the criteria reviewers rate.",
    illustration: <PostIllustration />,
  },
  {
    number: "02",
    icon: MessageSquareCode,
    title: "Review someone else's code",
    text: "Rate each criterion from 1 to 5 and write what you would tell the author. Every review earns you karma.",
    illustration: <ReviewIllustration />,
  },
  {
    number: "03",
    icon: ListFilter,
    title: "Get a feed that fits",
    text: "Add your stack, and the For you feed ranks requests by how well they match it.",
    illustration: <FeedIllustration />,
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
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.number} className="flex">
                <Spotlight className="w-full rounded-xl">
                  <Surface glass className="flex h-full flex-col p-6">
                    <span
                      aria-hidden
                      className="flex size-10 items-center justify-center rounded-lg border bg-muted/50"
                    >
                      <Icon className="size-5" />
                    </span>
                    <p className="mt-5 font-mono text-small text-muted-foreground">
                      {step.number}
                    </p>
                    <h3 className="mt-2 text-heading font-medium">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-body text-muted-foreground">
                      {step.text}
                    </p>
                    {/* mt-auto pushes the illustration to the bottom, so the
                        three line up whatever the text above them runs to. */}
                    <div className="mt-auto pt-6">{step.illustration}</div>
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
