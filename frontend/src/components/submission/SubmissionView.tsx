import { ExternalLink } from "lucide-react";
import { ReviewStatus } from "@/components/feed/ReviewStatus";
import { TechnologyTag } from "@/components/feed/TechnologyTag";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function SubmissionView({
  submission,
}: {
  submission: SubmissionDetail;
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
    <div className="space-y-3">
      <Card className="gap-0 py-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className={cn("min-w-0 text-lg font-medium", WRAP)}>
              {submission.title}
            </h1>
            <ReviewStatus
              status={submission.status}
              reviewCount={submission.reviewCount}
            />
          </div>

          <p
            className={cn(
              "mt-2 whitespace-pre-line text-sm/6 text-muted-foreground",
              WRAP,
            )}
          >
            {submission.description}
          </p>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {submission.technologies.map((technology) => (
              <li key={technology.id}>
                <TechnologyTag name={technology.name} />
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3">
            {/* Opens in a new tab. noopener stops the opened page from
                controlling this one through window.opener. */}
            <a
              href={submission.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
            >
              <ExternalLink className="size-4" aria-hidden />
              Open on GitHub
            </a>
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {repositoryPath}
            </span>
          </div>

          {/* GitHub metadata is fetched in Phase 7. Until then, and whenever a
              fetch fails, there is no snapshot, so nothing is rendered. */}
          {repository && (
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div className="flex gap-1.5">
                <dt>Stars</dt>
                <dd className="tabular-nums text-foreground">
                  {repository.stars}
                </dd>
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
                  <dd className="text-foreground">
                    {timeAgo(repository.lastPushedAt)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-4 flex h-9 items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-foreground">
                {submission.author.username}
              </span>
              <KarmaChip value={submission.author.karma} size="sm" />
            </span>
            <time
              dateTime={submission.createdAt}
              className="shrink-0 text-muted-foreground"
            >
              {timeAgo(submission.createdAt)}
            </time>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="p-4">
          <h2 className="text-sm font-medium">Ratings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {submission.reviewCount === 0
              ? "Not reviewed yet. Reviewers rate each criterion from 1 to 5."
              : `Average of ${submission.reviewCount} ${submission.reviewCount === 1 ? "review" : "reviews"}, out of 5.`}
          </p>
          <ul className="mt-3 space-y-2">
            {submission.criteria.map((criterion) => (
              <li
                key={criterion.id}
                className="rounded-lg bg-muted/50 px-3 py-2"
              >
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
        </CardContent>
      </Card>

      <section aria-labelledby="reviews-heading" className="pt-2">
        <h2 id="reviews-heading" className="text-sm font-medium">
          Reviews{" "}
          <span className="text-muted-foreground">
            ({submission.reviewCount})
          </span>
        </h2>

        {submission.reviews.length === 0 ? (
          <Card className="mt-3 gap-0 py-0">
            <CardContent className="p-4 text-sm">
              <p className="font-medium">No reviews yet</p>
              <p className="mt-1 text-muted-foreground">
                Reviews of this code will show up here, newest first.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-3 space-y-3">
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
      <Card className="gap-0 py-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-foreground">{review.reviewer}</span>
            <time
              dateTime={review.createdAt}
              className="shrink-0 text-muted-foreground"
            >
              {timeAgo(review.createdAt)}
            </time>
          </div>

          <p className={cn("mt-2 whitespace-pre-line text-sm/6", WRAP)}>
            {review.feedback}
          </p>

          <ul className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
            {review.ratings.map((rating) => {
              const label = labelById.get(rating.criterionId) ?? "Criterion";
              return (
                <li
                  key={rating.criterionId}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 truncate text-muted-foreground">
                    {label}
                  </span>
                  <RatingPips value={rating.rating} label={label} />
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </li>
  );
}
