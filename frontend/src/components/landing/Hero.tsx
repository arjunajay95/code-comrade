import Image from "next/image";
import { Container } from "@/components/shell/Container";
import { HERO_CREDIT } from "@/lib/config";
import hero from "../../../public/landing/hero.jpg";
import { HeroContent } from "./HeroContent";

// The section's height comes from the viewport, not from the image, so the
// image loading shifts nothing (D-36). Both overlays use the page background
// token, so the left side stays readable in light and dark. Below lg the text
// covers more of the photo, so the gradient is stronger there.
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[min(calc(100svh-3.5rem),56rem)] items-center overflow-hidden">
      <Image
        src={hero}
        alt=""
        fill
        priority
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover object-right"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-r from-background/95 via-background/80 to-background/50 lg:from-background lg:via-background/90 lg:via-50% lg:to-transparent lg:to-75%"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-background to-transparent"
      />

      <Container
        size="wide"
        verticalPadding={false}
        className="relative py-16 sm:py-20"
      >
        <HeroContent />
      </Container>

      <p className="absolute right-4 bottom-4 text-micro text-muted-foreground sm:right-6">
        Photo:{" "}
        <a
          href={HERO_CREDIT.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {HERO_CREDIT.name}
        </a>
      </p>
    </section>
  );
}
