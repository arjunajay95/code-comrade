import type { Metadata } from "next";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { Reveal } from "@/components/landing/Reveal";
import { SITE_DESCRIPTION } from "@/lib/config";

export const metadata: Metadata = {
  title: { absolute: "CodeComrade, peer code review with karma" },
  description: SITE_DESCRIPTION,
};

// Regenerated hourly, so the preview's relative times stay current. The page
// makes no API call (PROJECT_BLUEPRINT §13) and does not read the session: the
// middleware sends a signed-in visitor to /feed before this renders.
export const revalidate = 3600;

export default function Home() {
  return (
    <>
      <Hero />
      {/* z-10 keeps this section above the hero photo, which runs into it. */}
      <Reveal className="relative z-10">
        <HowItWorks />
      </Reveal>
      <Reveal>
        <ProductPreview />
      </Reveal>
      <Reveal>
        <ClosingCta />
      </Reveal>
    </>
  );
}
