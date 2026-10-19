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

// A decorative sample of one review request for the hero, shown only where it
// fits clear of the hero text and the main summit, and below the header
// without being clipped by the hero. It is built from the app's own components,
// is static, and cannot be reached: aria-hidden, an inert card, no links. The
// copy button in its code block is inert with the rest.
//
// The wrapper has the dark class, so its tokens are the dark ones in both
// themes, as in the rest of the hero. It sits 3rem from the right edge,
// clear of the vertical photo credit.
export function HeroReviewCard() {
  const request = createHeroRequest();
  const { review } = request;

  return (
    <div
      aria-hidden
      className="dark absolute top-8 right-12 z-10 hidden w-md select-none min-[90rem]:[@media(min-height:45rem)]:block dark:top-24"
    >
      {/* The spotlight listens on the wrapper, and the card inside is inert.
          Pointer events pass through inert content to the element behind it,
          so the wrapper still sees the pointer while nothing inside can be
          focused or clicked. */}
      <Spotlight className="rounded-xl">
        <Surface inert glass className="p-4 text-foreground">
          <h3 className="truncate text-heading font-medium">{request.title}</h3>

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
            <FormattedText text={review.feedback} className="mt-2 text-small" />
            <ul className="mt-3 space-y-2">
              {review.ratings.map((rating) => (
                <li
                  key={rating.label}
                  className="flex items-center justify-between gap-3 text-small"
                >
                  <span className="text-muted-foreground">{rating.label}</span>
                  <RatingPips value={rating.value} label={rating.label} />
                </li>
              ))}
            </ul>
          </div>
        </Surface>
      </Spotlight>
    </div>
  );
}
