"use client";

import { Button } from "@/components/ui/button";
import { usePublicFeed } from "@/hooks/useFeed";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/apiClient";
import { useFeedStore } from "@/stores/feedStore";
import { FeedItemRow } from "./FeedItemRow";
import { FeedItemSkeleton } from "./FeedItemSkeleton";
import { FeedPagination } from "./FeedPagination";

const PAGE_SIZE = 10;

export function Feed() {
  const page = useFeedStore((state) => state.page);
  const setPage = useFeedStore((state) => state.setPage);
  const { data, error, isPending, isError, isPlaceholderData, refetch } =
    usePublicFeed({
      page,
      limit: PAGE_SIZE,
    });

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading submissions">
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          <FeedItemSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <FeedError error={error} onRetry={() => void refetch()} />;
  }

  if (data.items.length === 0) {
    return <EmptyFeed onFirstPage={page > 1 ? () => setPage(1) : undefined} />;
  }

  return (
    <div>
      {/* Dimmed while the next page loads, so the click visibly registers. */}
      <div
        aria-busy={isPlaceholderData}
        className={cn(isPlaceholderData && "opacity-50 transition-opacity")}
      >
        {data.items.map((item) => (
          <FeedItemRow key={item.id} item={item} />
        ))}
      </div>
      <FeedPagination
        page={data.meta.currentPage}
        totalPages={data.meta.totalPages}
        disabled={isPlaceholderData}
        onPageChange={(next) => {
          setPage(next);
          // Otherwise the new page would open scrolled to the bottom.
          window.scrollTo({ top: 0 });
        }}
      />
    </div>
  );
}

function FeedError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  // The request id is what to quote when reporting a problem. It matches the
  // server's log lines for that request.
  const requestId = error instanceof ApiError ? error.requestId : null;

  return (
    <div role="alert" className="rounded-md border p-4 text-sm">
      <p className="font-medium">Could not load the feed</p>
      <p className="mt-1 text-muted-foreground">{error.message}</p>
      {requestId && (
        <p className="mt-1 text-xs text-muted-foreground">
          Reference: {requestId}
        </p>
      )}
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function EmptyFeed({ onFirstPage }: { onFirstPage?: () => void }) {
  // A page past the end comes back empty, not as an error. That can happen
  // if the remembered page no longer exists.
  if (onFirstPage) {
    return (
      <div className="rounded-md border p-4 text-sm">
        <p className="text-muted-foreground">There is nothing on this page.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onFirstPage}
        >
          Back to page 1
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-4 text-sm">
      <p className="font-medium">No submissions yet</p>
      <p className="mt-1 text-muted-foreground">
        Code posted for review will show up here.
      </p>
    </div>
  );
}
