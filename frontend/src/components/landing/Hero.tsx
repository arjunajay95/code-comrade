import Image from "next/image";
import { Container } from "@/components/shell/Container";
import { HERO_CREDIT } from "@/lib/config";
import hero from "../../../public/landing/hero.jpg";
import { HeroContent } from "./HeroContent";

// Two layouts, switched by CSS on the html theme class alone, so nothing
// flashes or shifts on load.
//
// Dark: the photo is a layer that runs 40vh past the hero and dissolves into
// the page with masks (the hero-fade class). The next section sits above it.
//
// Light: a rounded panel inset in the page, with the photo whole inside it.
//
// The text block always sits in a wrapper with the dark class, so its tokens
// are the dark ones in both themes, over a photo that is dark in both. The
// image layer is outside that wrapper, so it keys on the real theme.
//
// The layer's size comes from the section and viewport units, never from the
// image, so its load shifts nothing (D-36). object-position 60% frames the
// central peak on a narrow screen, where the layer is taller than it is wide.
export function Hero() {
  return (
    <section className="relative isolate mx-3 mt-3 flex items-stretch overflow-hidden rounded-3xl sm:mx-6 md:min-h-[min(calc(100svh-3.5rem),56rem)] dark:mx-0 dark:mt-0 dark:overflow-visible dark:rounded-none">
      <div
        aria-hidden
        className="hero-fade absolute inset-x-0 top-0 bottom-0 -z-10 dark:bottom-[-40vh]"
      >
        <Image
          src={hero}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="object-cover object-[60%_center]"
        />
      </div>

      <div className="dark relative flex w-full items-center text-foreground">
        <Container
          size="wide"
          verticalPadding={false}
          className="relative pt-28 pb-24 md:py-20"
        >
          {/* For contrast only: a feathered scrim from the background token,
              so the text stays readable over the brightest part of the photo. */}
          <div
            aria-hidden
            className="hero-scrim pointer-events-none absolute inset-x-0 -inset-y-16 -z-10"
          />
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
      </div>
    </section>
  );
}
