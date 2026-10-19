import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
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

// The page makes no API call (PROJECT_BLUEPRINT §13), so its first paint never
// waits on the API. A signed-in visitor is sent on before anything renders.
export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/feed");

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
