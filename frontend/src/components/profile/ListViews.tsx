"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { FeedPagination } from "@/components/feed/FeedPagination";
import { TechnologyTag } from "@/components/feed/TechnologyTag";
import { RatingPips } from "@/components/submission/RatingPips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/apiClient";
import type { PageMeta } from "@/services/feed";
import type { ReviewSummary, SubmissionSummary } from "@/services/users";

export const LIST_PAGE_SIZE = 10;

interface PagedListProps<T> {
  query: UseQueryResult<{ items: T[]; meta: PageMeta }, Error>;
  page: number;
  onPageChange: (page: number) => void;
  label: string;
  emptyTitle: string;
  emptyText: string;
  emptyAction?: ReactNode;
  renderItem: (item: T) => ReactNode;
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
  renderItem,
}: PagedListProps<T>) {
  if (query.isError) {
    // The request id is what to quote when reporting a problem. It matches
    // the server's log lines for that request.
    const requestId =
      query.error instanceof ApiError ? query.error.requestId : null;
    return (
      <Card role="alert" className="gap-0 py-0">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Could not load {label}</p>
          <p className="mt-1 text-muted-foreground">{query.error.message}</p>
          {requestId && (
            <p className="mt-1 text-xs text-muted-foreground">
              Reference: <span className="font-mono">{requestId}</span>
            </p>
          )}
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
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
          <ListItemSkeleton key={index} />
        ))}
      </div>
    );
  }

  const { items, meta } = query.data;

  if (items.length === 0) {
    // A page past the end comes back empty, not as an error.
    if (page > 1) {
      return (
        <Card className="gap-0 py-0">
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">
              There is nothing on this page.
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => onPageChange(1)}
            >
              Back to page 1
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="gap-0 py-0">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">{emptyTitle}</p>
          <p className="mt-1 text-muted-foreground">{emptyText}</p>
          {emptyAction}
        </CardContent>
      </Card>
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
        {items.map((item) => (
          <li key={item.id}>{renderItem(item)}</li>
        ))}
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

function ListItemSkeleton() {
  return (
    <Card className="gap-0 py-0" aria-hidden>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-3 flex min-h-6 items-center gap-1.5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="mt-3 h-9 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function SubmissionSummaryCard({
  submission,
}: {
  submission: SubmissionSummary;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4">
        <h2 className="text-base font-medium [overflow-wrap:anywhere]">
          <Link
            href={`/submissions/${submission.id}`}
            className="underline-offset-4 hover:underline"
          >
            {submission.title}
          </Link>
        </h2>
        <ul className="mt-3 flex min-h-6 flex-wrap gap-1.5">
          {submission.technologies.map((technology) => (
            <li key={technology.id}>
              <TechnologyTag name={technology.name} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex h-9 items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 text-xs">
          <span className="text-muted-foreground">
            {submission.reviewCount === 0
              ? "needs a review"
              : `${submission.reviewCount} ${submission.reviewCount === 1 ? "review" : "reviews"}`}
          </span>
          <time
            dateTime={submission.createdAt}
            className="shrink-0 font-mono text-muted-foreground"
          >
            {timeAgo(submission.createdAt)}
          </time>
        </div>
      </CardContent>
    </Card>
  );
}

// A review in a list. The submission it belongs to is always shown, because
// a list of reviews with no context is not useful.
export function ReviewSummaryCard({ review }: { review: ReviewSummary }) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="min-w-0 truncate text-muted-foreground">
            Review of{" "}
            <Link
              href={`/submissions/${review.submission.id}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {review.submission.title}
            </Link>
          </span>
          <time
            dateTime={review.createdAt}
            className="shrink-0 font-mono text-muted-foreground"
          >
            {timeAgo(review.createdAt)}
          </time>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          by{" "}
          <Link
            href={`/profile/${review.reviewer}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {review.reviewer}
          </Link>
          , on code by{" "}
          <Link
            href={`/profile/${review.submission.author}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {review.submission.author}
          </Link>
        </p>

        <p className="mt-2 whitespace-pre-line text-sm/6 [overflow-wrap:anywhere]">
          {review.feedback}
        </p>

        <ul className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
          {review.ratings.map((rating) => (
            <li
              key={rating.criterion}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {rating.criterion}
              </span>
              <RatingPips value={rating.rating} label={rating.criterion} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
