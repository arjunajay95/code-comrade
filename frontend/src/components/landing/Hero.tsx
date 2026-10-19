import { getImageProps } from "next/image";
import ReactDOM from "react-dom";
import { Container } from "@/components/shell/Container";
import { HERO_CREDIT } from "@/lib/config";
import hero from "../../../public/landing/hero.jpg";
import heroMobile from "../../../public/landing/hero-mobile.jpg";
import { HeroContent } from "./HeroContent";
import { HeroReviewCard } from "./HeroReviewCard";

// Art direction: a portrait crop below md and the landscape photo from md. The
// sizes values are the widths the image renders at under object-cover, not
// 100vw, so the browser picks a candidate that is sharp at that width.
//
// Below md the layer is the portrait crop (1680 by 2984, 0.563 wide for its
// height) at a height of about the hero content (638px with the padding and
// the 3.5rem under the header) plus the 60vh bleed, and cover scales it by
// height. The width it renders at is that height times 0.563.
//
// From md the layer is the landscape photo (4717 by 2984, 1.581) at a height
// of the hero (min-h, up to 56rem) plus 3.5rem plus the 60vh bleed. It renders
// at that height times 1.581, or at the viewport width if that is larger.
//
// Light mode has no bleed, so it needs less than these. The sizes cover the
// dark layout, which is the larger one, so light downloads a candidate that is
// at least as sharp as it needs.
const MOBILE_SIZES = "calc((638px + 60vh) * 0.563)";
const DESKTOP_SIZES =
  "max(100vw, calc((min(100vh - 3.5rem, 56rem) + 3.5rem + 60vh) * 1.581))";
const DESKTOP_MEDIA = "(min-width: 48rem)";
const MOBILE_MEDIA = "not all and (min-width: 48rem)";

const imageOptions = {
  alt: "",
  fill: true,
  placeholder: "blur",
  loading: "eager",
  fetchPriority: "high",
} as const;

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
  const { props: desktop } = getImageProps({
    ...imageOptions,
    src: hero,
    sizes: DESKTOP_SIZES,
  });
  const { props: mobile } = getImageProps({
    ...imageOptions,
    src: heroMobile,
    sizes: MOBILE_SIZES,
  });

  // getImageProps does not preload. One preload per breakpoint, each with its
  // own media query, so a phone never fetches the landscape photo and a
  // desktop never fetches the portrait crop.
  ReactDOM.preload(mobile.src, {
    as: "image",
    imageSrcSet: mobile.srcSet,
    imageSizes: MOBILE_SIZES,
    media: MOBILE_MEDIA,
    fetchPriority: "high",
  });
  ReactDOM.preload(desktop.src, {
    as: "image",
    imageSrcSet: desktop.srcSet,
    imageSizes: DESKTOP_SIZES,
    media: DESKTOP_MEDIA,
    fetchPriority: "high",
  });

  return (
    <section
      data-landing
      className="relative isolate mx-3 mt-3 flex items-stretch overflow-hidden rounded-3xl sm:mx-6 md:min-h-[min(calc(100svh-3.5rem),56rem)] dark:mx-0 dark:-mt-14 dark:overflow-visible dark:rounded-none dark:md:min-h-[calc(min(100svh-3.5rem,56rem)+3.5rem)]"
    >
      <div
        aria-hidden
        className="hero-fade absolute inset-x-0 top-0 bottom-0 -z-20 dark:bottom-[-60vh]"
      >
        <picture className="contents">
          <source
            media={DESKTOP_MEDIA}
            srcSet={desktop.srcSet}
            sizes={DESKTOP_SIZES}
          />
          {/* The blur placeholders are CSS variables, so each breakpoint
              shows the blur of its own crop (see .hero-img). */}
          {/* A picture element needs a plain img. next/image has no art
              direction, so getImageProps supplies the optimized srcsets. */}
          <img
            alt=""
            src={mobile.src}
            srcSet={mobile.srcSet}
            sizes={MOBILE_SIZES}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            data-nimg="fill"
            className="hero-img object-cover object-center md:object-[60%_center]"
            style={{
              ...mobile.style,
              backgroundImage: undefined,
              ["--hero-blur-mobile" as string]: mobile.style?.backgroundImage,
              ["--hero-blur-desktop" as string]: desktop.style?.backgroundImage,
            }}
          />
        </picture>
      </div>

      <HeroReviewCard />

      {/* For contrast only. It covers the whole hero and fades out inside it,
          so no edge of it shows. The dark class makes its background token the
          dark one in both themes. Without it, the light theme would paint a
          light scrim over text that is always light. */}
      <div
        aria-hidden
        className="dark hero-scrim pointer-events-none absolute inset-0 -z-10"
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
