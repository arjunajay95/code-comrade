"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { CodeXml } from "lucide-react";
import { FeedPagination } from "@/components/feed/FeedPagination";
import { ErrorCard, StateCard } from "@/components/shell/StateCard";
import { STRETCHED_LINK, Surface } from "@/components/shell/Surface";
import { RatingPips } from "@/components/submission/RatingPips";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { excerpt, hasCode } from "@/lib/formattedText";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { PageMeta } from "@/services/feed";
import type { ReviewSummary } from "@/services/users";

export const LIST_PAGE_SIZE = 10;

interface PagedListProps<T> {
  query: UseQueryResult<{ items: T[]; meta: PageMeta }, Error>;
  page: number;
  onPageChange: (page: number) => void;
  label: string;
  emptyTitle: string;
  emptyText: string;
  emptyAction?: ReactNode;
  // One placeholder, shown three times while the first page loads. It should
  // mirror the card renderItem returns.
  skeleton: ReactNode;
  renderItem: (item: T) => ReactNode;
  // For items that render their own li, such as FeedItemRow, so the list does
  // not nest one li in another.
  bareItems?: boolean;
}

// Loading, error, empty and loaded states for one paged list, so the three
// /me lists and anything like them behave the same way.
export function PagedList<T extends { id: number }>({
  query,
  page,
  onPageChange,
  label,
  emptyTitle,
  emptyText,
  emptyAction,
  skeleton,
  renderItem,
  bareItems = false,
}: PagedListProps<T>) {
  if (query.isError) {
    return (
      <ErrorCard
        title={`Could not load ${label}`}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isPending || !query.data) {
    return (
      <div
        aria-busy="true"
        aria-label={`Loading ${label}`}
        className="space-y-3"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}>{skeleton}</div>
        ))}
      </div>
    );
  }

  const { items, meta } = query.data;

  if (items.length === 0) {
    // A page past the end comes back empty, not as an error.
    if (page > 1) {
      return (
        <StateCard title="There is nothing on this page.">
          <Button variant="outline" onClick={() => onPageChange(1)}>
            Back to page 1
          </Button>
        </StateCard>
      );
    }
    return (
      <StateCard title={emptyTitle} text={emptyText}>
        {emptyAction}
      </StateCard>
    );
  }

  return (
    <div>
      <ul
        aria-busy={query.isPlaceholderData}
        className={cn(
          "space-y-3",
          query.isPlaceholderData && "opacity-50 transition-opacity",
        )}
      >
        {items.map((item) =>
          bareItems ? (
            <Fragment key={item.id}>{renderItem(item)}</Fragment>
          ) : (
            <li key={item.id}>{renderItem(item)}</li>
          ),
        )}
      </ul>
      <FeedPagination
        page={meta.currentPage}
        totalPages={meta.totalPages}
        disabled={query.isPlaceholderData}
        label={`${label} pages`}
        onPageChange={onPageChange}
      />
    </div>
  );
}

// A review's height depends on its feedback and its criteria. This one holds a
// 20px header, a 20px byline, a two-line 48px body and a 100px ratings panel,
// which is a typical review, not every review.
export function ReviewSummarySkeleton() {
  return (
    <Surface aria-hidden>
      <div className="flex h-5 items-center justify-between gap-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="mt-1 h-4 w-1/3" />
      <div className="mt-3 flex h-12 flex-col justify-center gap-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="mt-4 h-25 w-full rounded-lg" />
    </Surface>
  );
}

// A review in a list. The submission it belongs to is always shown, because
// a list of reviews with no context is not useful.
export function ReviewSummaryCard({
  review,
  hideReviewer = false,
}: {
  review: ReviewSummary;
  // On the user's own written reviews the reviewer is always them.
  hideReviewer?: boolean;
}) {
  const personLink =
    "relative z-10 text-foreground underline-offset-4 hover:underline";

  return (
    <Surface interactive>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-small text-muted-foreground">
          Review of{" "}
          <Link
            href={`/submissions/${review.submission.id}`}
            data-card-link
            className={cn(STRETCHED_LINK, "text-foreground")}
          >
            {review.submission.title}
          </Link>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {hasCode(review.feedback) && (
            <CodeXml
              role="img"
              aria-label="Includes code"
              className="size-4 text-muted-foreground"
            />
          )}
          <time
            dateTime={review.createdAt}
            className="font-mono text-micro text-muted-foreground"
          >
            {timeAgo(review.createdAt)}
          </time>
        </span>
      </div>
      <p className="mt-1 text-small text-muted-foreground">
        {hideReviewer ? (
          "On code by "
        ) : (
          <>
            by{" "}
            <Link href={`/profile/${review.reviewer}`} className={personLink}>
              {review.reviewer}
            </Link>
            , on code by{" "}
          </>
        )}
        <Link
          href={`/profile/${review.submission.author}`}
          className={personLink}
        >
          {review.submission.author}
        </Link>
      </p>

      {/* A plain excerpt: code is left out, and the icon says it was there. */}
      <p className="mt-3 line-clamp-3 text-body [overflow-wrap:anywhere]">
        {excerpt(review.feedback)}
      </p>

      {/* Grouped data: one rating per criterion. */}
      <ul className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3">
        {review.ratings.map((rating) => (
          <li
            key={rating.criterion}
            className="flex items-center justify-between gap-3 text-small"
          >
            <span className="min-w-0 truncate text-muted-foreground">
              {rating.criterion}
            </span>
            <RatingPips value={rating.rating} label={rating.criterion} />
          </li>
        ))}
      </ul>
    </Surface>
  );
}
