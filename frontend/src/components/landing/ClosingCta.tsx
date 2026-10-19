import { Container } from "@/components/shell/Container";
import { LandingActions } from "./LandingActions";
import { SectionTitle } from "./SectionTitle";

export function ClosingCta() {
  return (
    <section className="py-24 text-center">
      <Container size="wide" verticalPadding={false}>
        <SectionTitle>Start with someone else&apos;s code.</SectionTitle>
        <LandingActions className="mt-8 justify-center" />
      </Container>
    </section>
  );
}
