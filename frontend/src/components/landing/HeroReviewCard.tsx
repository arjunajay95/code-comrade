import { ReviewStatus } from "@/components/feed/ReviewStatus";
import { TechnologyTagRow } from "@/components/feed/TechnologyTagRow";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { Surface } from "@/components/shell/Surface";
import { RatingPips } from "@/components/submission/RatingPips";
import { RatingRow } from "@/components/submission/RatingRow";
import { FormattedText } from "@/components/text/FormattedText";
import { createHeroRequest } from "@/content/landingHero";
import { timeAgo } from "@/lib/time";
import { Spotlight } from "./Spotlight";
import { TiltPanel } from "./TiltPanel";

// A decorative sample of one review request for the hero, as a tilted glass
// panel (PROJECT_BLUEPRINT §13). It shows from 1344px wide and 720px high,
// where it fits clear of the hero
// text and the top of the main summit, and below the header without being
// clipped by the hero. It is built from the app's own components, is static,
// and cannot be reached: aria-hidden, an inert card, no links. The copy button
// in its code block is inert with the rest.
//
// Its left edge is at 61% of the hero width plus 1rem. The summit's upper
// slopes end at about 61% of the width at every viewport, because the photo
// scales with the hero, so this keeps the apex and the slopes visible and lets
// the panel overlap the lower slopes.
//
// The wrapper has the dark class, so its tokens are the dark ones in both
// themes, as in the rest of the hero.
export function HeroReviewCard() {
  const request = createHeroRequest();
  const { review } = request;

  return (
    <div
      aria-hidden
      className="dark absolute top-8 left-[calc(61%+1rem)] z-10 hidden w-md select-none min-[84rem]:[@media(min-height:45rem)]:block dark:top-24"
    >
      {/* A diffused glow in the colour of the photo's sky, bleeding past the
          panel's edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-[radial-gradient(closest-side,var(--color-hero-sky),transparent)] opacity-60 blur-2xl"
      />
      {/* The spotlight listens on the wrapper, and the card inside is inert.
          Pointer events pass through inert content to the element behind it,
          so the wrapper still sees the pointer while nothing inside can be
          focused or clicked. */}
      <TiltPanel>
        <Spotlight className="rounded-xl">
          <Surface
            inert
            glass
            className="relative p-4 text-foreground shadow-[inset_0_1px_0_0_var(--glass-highlight),inset_1px_0_0_0_var(--glass-highlight)]"
          >
            {/* The specular highlight: a soft diagonal sheen across the upper
                part of the glass. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-br from-foreground/15 via-foreground/5 to-transparent mask-[linear-gradient(to_bottom,#000,transparent_50%)]"
            />

            <h3 className="truncate text-heading font-medium">
              {request.title}
            </h3>

            <div className="mt-2 flex h-6 items-center gap-2">
              <span className="min-w-0 truncate text-small">
                {request.author.username}
              </span>
              <KarmaChip value={request.author.karma} size="sm" />
              <span className="text-muted-foreground">&middot;</span>
              <span className="shrink-0 font-mono text-micro text-muted-foreground">
                {timeAgo(request.createdAt)}
              </span>
              <span className="ml-auto">
                <ReviewStatus
                  status="REVIEWED"
                  reviewCount={request.reviewCount}
                />
              </span>
            </div>

            <TechnologyTagRow
              technologies={request.technologies}
              className="mt-3"
            />

            <FormattedText
              text={request.description}
              blurCode
              className="mt-3 text-small text-muted-foreground"
            />

            <ul className="mt-4 space-y-3 border-t pt-3">
              {request.criteria.map((criterion) => (
                <li key={criterion.label}>
                  <RatingRow
                    label={criterion.label}
                    value={criterion.average}
                    valueText={criterion.average.toFixed(1)}
                  />
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t pt-3">
              <div className="flex h-6 items-center justify-between gap-2">
                <span className="text-small">{review.reviewer}</span>
                <KarmaChip value={review.karma} size="sm" />
              </div>
              <FormattedText
                text={review.feedback}
                className="mt-2 text-small"
              />
              <ul className="mt-3 space-y-2">
                {review.ratings.map((rating) => (
                  <li
                    key={rating.label}
                    className="flex items-center justify-between gap-3 text-small"
                  >
                    <span className="text-muted-foreground">
                      {rating.label}
                    </span>
                    <RatingPips value={rating.value} label={rating.label} />
                  </li>
                ))}
              </ul>
            </div>
          </Surface>
        </Spotlight>
      </TiltPanel>
    </div>
  );
}
