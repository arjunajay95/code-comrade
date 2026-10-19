import { Container } from "@/components/shell/Container";
import { Surface } from "@/components/shell/Surface";
import { SectionTitle } from "./SectionTitle";

const STEPS = [
  {
    number: "01",
    title: "Post a request",
    text: "Link a public GitHub repository, say what you want looked at, and choose the criteria reviewers rate.",
  },
  {
    number: "02",
    title: "Review someone else's code",
    text: "Rate each criterion from 1 to 5 and write what you would tell the author. Every review earns you karma.",
  },
  {
    number: "03",
    title: "Get a feed that fits",
    text: "Add your stack, and the For you feed ranks requests by how well they match it.",
  },
] as const;

export function HowItWorks() {
  return (
    // z-10 keeps this section above the hero photo, which runs 40vh into it.
    <section className="relative z-10 py-24">
      <Container size="wide" verticalPadding={false}>
        <div className="text-center md:text-left">
          <SectionTitle>How it works</SectionTitle>
          <p className="mt-3 text-body text-muted-foreground">
            Three steps, and every review you write counts.
          </p>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number}>
              <Surface className="h-full p-6">
                <p className="font-mono text-small text-muted-foreground">
                  {step.number}
                </p>
                <h3 className="mt-4 text-heading font-medium">{step.title}</h3>
                <p className="mt-2 text-body text-muted-foreground">
                  {step.text}
                </p>
              </Surface>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
