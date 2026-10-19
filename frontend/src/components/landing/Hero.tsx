import Image from "next/image";
import { Container } from "@/components/shell/Container";
import { HERO_CREDIT } from "@/lib/config";
import hero from "../../../public/landing/hero.jpg";
import { HeroContent } from "./HeroContent";

// Two layouts, switched by CSS on the html theme class alone, so nothing
// flashes or shifts on load.
//
// Dark: the hero is pulled 3.5rem up under the sticky header, and the same
// amount is added to its top padding, so the text does not move. The photo is
// a layer that runs 60vh past the hero and dissolves into the page with masks
// (the hero-fade class). The next section sits above it.
//
// Light: a rounded panel inset in the page, with the photo whole inside it.
//
// The text block always sits in a wrapper with the dark class, so its tokens
// are the dark ones in both themes, over a photo that is dark in both. The
// image layer is outside that wrapper, so it keys on the real theme. Anything
// inside the wrapper that must differ by theme cannot use the dark variant,
// since it always matches there.
//
// The layer's size comes from the section and viewport units, never from the
// image, so its load shifts nothing (D-36). object-position 60% frames the
// central peak on a narrow screen, where the layer is taller than it is wide.
export function Hero() {
  return (
    <section
      data-landing
      className="relative isolate mx-3 mt-3 flex items-stretch overflow-hidden rounded-3xl sm:mx-6 md:min-h-[min(calc(100svh-3.5rem),56rem)] dark:mx-0 dark:-mt-14 dark:overflow-visible dark:rounded-none dark:md:min-h-[calc(min(100svh-3.5rem,56rem)+3.5rem)]"
    >
      <div
        aria-hidden
        className="hero-fade absolute inset-x-0 top-0 bottom-0 -z-20 dark:bottom-[-60vh]"
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

      {/* For contrast only. It covers the whole hero and fades out inside it,
          so no edge of it shows. */}
      <div
        aria-hidden
        className="hero-scrim pointer-events-none absolute inset-0 -z-10"
      />

      <div className="dark relative flex w-full items-center text-foreground dark:pt-14">
        <Container
          size="wide"
          verticalPadding={false}
          className="relative pt-28 pb-24 md:py-20"
        >
          <HeroContent />
        </Container>
      </div>

      {/* Vertical, reading bottom to top, in the top-right corner. In dark it
          starts below the header, which overlaps the hero there. */}
      <div className="dark absolute top-4 right-4 z-10 sm:right-6 dark:top-18">
        <p className="rotate-180 text-micro text-muted-foreground opacity-60 transition-opacity [writing-mode:vertical-rl] focus-within:opacity-100 hover:opacity-100">
          Photo:{" "}
          <a
            href={HERO_CREDIT.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {HERO_CREDIT.name}
          </a>
        </p>
      </div>
    </section>
  );
}
