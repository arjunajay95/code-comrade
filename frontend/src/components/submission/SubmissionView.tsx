import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { ReviewStatus } from "@/components/feed/ReviewStatus";
import { TechnologyTag } from "@/components/feed/TechnologyTag";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { MonogramAvatar } from "@/components/profile/MonogramAvatar";
import { FormattedText } from "@/components/text/FormattedText";
import { StateCard } from "@/components/shell/StateCard";
import { Surface } from "@/components/shell/Surface";
import { buttonVariants } from "@/components/ui/button";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { SubmissionDetail } from "@/services/submissions";
import { RatingRow } from "./RatingRow";
import { RatingPips } from "./RatingPips";

type Review = SubmissionDetail["reviews"][number];

// Text written by users can contain a long string with no spaces, such as a
// pasted URL. overflow-wrap:anywhere lets it break instead of pushing the
// page wider than the screen.
const WRAP = "[overflow-wrap:anywhere]";

// lucide-react has no brand icons, so this is the GitHub mark drawn inline.
function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function SubmissionView({
  submission,
  actions,
  reviewSlot,
}: {
  submission: SubmissionDetail;
  // Buttons for the signed-in viewer, at the right of the title.
  actions?: ReactNode;
  // The review form or the reason there is none, above the review list.
  reviewSlot?: ReactNode;
}) {
  // A review stores ratings by criterion id. This turns an id back into the
  // label shown to the reader.
  const labelById = new Map(
    submission.criteria.map((criterion) => [criterion.id, criterion.label]),
  );
  const repositoryPath = submission.githubUrl.replace(
    "https://github.com/",
    "",
  );
  const { repository } = submission;

  return (
    <div>
      {/* The page opens on the title, not a card. SubmissionSkeleton mirrors
          this block's rows. */}
      <header className="border-b pb-8">
        {/* Top-aligned, so the button stays beside the first line when a long
            title wraps. min-w-0 lets the title shrink instead of pushing the
            button off a 320px screen. */}
        <div className="flex items-start justify-between gap-3">
          <h1 className={cn("min-w-0 text-title font-semibold", WRAP)}>
            {submission.title}
          </h1>
          {actions}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/profile/${submission.author.username}`}
            className="truncate text-small text-foreground underline-offset-4 hover:underline"
          >
            {submission.author.username}
          </Link>
          <KarmaChip value={submission.author.karma} size="sm" />
          <span aria-hidden className="text-muted-foreground">
            &middot;
          </span>
          <time
            dateTime={submission.createdAt}
            className="font-mono text-micro text-muted-foreground"
          >
            {timeAgo(submission.createdAt)}
          </time>
          <ReviewStatus
            status={submission.status}
            reviewCount={submission.reviewCount}
          />
        </div>

        <FormattedText
          text={submission.description}
          className="mt-4 text-body text-foreground"
        />

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {submission.technologies.map((technology) => (
            <li key={technology.id}>
              <TechnologyTag name={technology.name} />
            </li>
          ))}
        </ul>

        {/* One button holds the repository path, so a long path truncates
            inside it and the full path stays in the title. Opens in a new tab;
            noopener stops the opened page from controlling this one through
            window.opener. */}
        <a
          href={submission.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${repositoryPath} on GitHub`}
          title={repositoryPath}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-6 max-w-full",
          )}
        >
          <GithubMark className="size-4 shrink-0" />
          <span className="min-w-0 truncate font-mono text-small">
            {repositoryPath}
          </span>
          <ExternalLink className="size-4 shrink-0" aria-hidden />
        </a>

        {/* GitHub metadata is fetched in Phase 7. Until then, and whenever a
            fetch fails, there is no snapshot, so nothing is rendered. */}
        {repository && (
          <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-small text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>Stars</dt>
              <dd className="font-mono text-foreground">{repository.stars}</dd>
            </div>
            {repository.primaryLanguage && (
              <div className="flex gap-1.5">
                <dt>Language</dt>
                <dd className="text-foreground">
                  {repository.primaryLanguage}
                </dd>
              </div>
            )}
            {repository.lastPushedAt && (
              <div className="flex gap-1.5">
                <dt>Last push</dt>
                <dd className="font-mono text-foreground">
                  {timeAgo(repository.lastPushedAt)}
                </dd>
              </div>
            )}
          </dl>
        )}
      </header>

      <div className="mt-8 space-y-6">
        <Surface>
          <h2 className="text-heading font-medium">Ratings</h2>
          <p className="mt-1 text-small text-muted-foreground">
            {submission.reviewCount === 0
              ? "Not reviewed yet. Reviewers rate each criterion from 1 to 5."
              : `Average of ${submission.reviewCount} ${submission.reviewCount === 1 ? "review" : "reviews"}, out of 5.`}
          </p>
          {/* Grouped data, so this is the one place a nested panel is used. */}
          <ul className="mt-4 space-y-4 rounded-lg bg-muted/50 p-3">
            {submission.criteria.map((criterion) => (
              <li key={criterion.id}>
                <RatingRow
                  label={criterion.label}
                  value={criterion.averageRating}
                  valueText={
                    criterion.averageRating === null
                      ? "no ratings yet"
                      : criterion.averageRating.toFixed(1)
                  }
                />
              </li>
            ))}
          </ul>
        </Surface>

        {reviewSlot}

        <section aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="text-heading font-medium">
            Reviews{" "}
            <span className="font-mono text-muted-foreground">
              ({submission.reviewCount})
            </span>
          </h2>

          {submission.reviews.length === 0 ? (
            <StateCard
              className="mt-4"
              title="No reviews yet"
              text="Reviews of this code will show up here, newest first."
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {submission.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  labelById={labelById}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  labelById,
}: {
  review: Review;
  labelById: Map<number, string>;
}) {
  return (
    <li>
      <Surface>
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <MonogramAvatar username={review.reviewer} size={20} />
            <Link
              href={`/profile/${review.reviewer}`}
              className="min-w-0 truncate text-small text-foreground underline-offset-4 hover:underline"
            >
              {review.reviewer}
            </Link>
          </span>
          <time
            dateTime={review.createdAt}
            className="shrink-0 font-mono text-micro text-muted-foreground"
          >
            {timeAgo(review.createdAt)}
          </time>
        </div>

        <FormattedText text={review.feedback} className="mt-3 text-body" />

        {/* Grouped data: one rating per criterion. */}
        <ul className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3">
          {review.ratings.map((rating) => {
            const label = labelById.get(rating.criterionId) ?? "Criterion";
            return (
              <li
                key={rating.criterionId}
                className="flex items-center justify-between gap-3 text-small"
              >
                <span className="min-w-0 truncate text-muted-foreground">
                  {label}
                </span>
                <RatingPips value={rating.rating} label={label} />
              </li>
            );
          })}
        </ul>
      </Surface>
    </li>
  );
}
