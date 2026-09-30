"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePersonalizedFeed, usePublicFeed } from "@/hooks/useFeed";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/apiClient";
import type { FeedItem, PageMeta } from "@/services/feed";
import { useFeedStore, type FeedView } from "@/stores/feedStore";
import { FeedFilters } from "./FeedFilters";
import { FeedItemRow } from "./FeedItemRow";
import { FeedItemSkeleton } from "./FeedItemSkeleton";
import { FeedPagination } from "./FeedPagination";
import { FeedTabs } from "./FeedTabs";

const PAGE_SIZE = 10;

type ListItem = FeedItem & { matchedTechnologies?: readonly string[] };

// What the list needs from either feed's query, flattened so one component
// can render both.
interface ListState {
  items: ListItem[] | undefined;
  meta: PageMeta | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  isPlaceholderData: boolean;
  refetch: () => void;
}

function toListState<T extends ListItem>(
  query: UseQueryResult<{ items: T[]; meta: PageMeta }, Error>,
): ListState {
  return {
    items: query.data?.items,
    meta: query.data?.meta,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    isPlaceholderData: query.isPlaceholderData,
    refetch: () => void query.refetch(),
  };
}

export function Feed() {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useMe();
  const chosenView = useFeedStore((state) => state.view);
  const setView = useFeedStore((state) => state.setView);
  const page = useFeedStore((state) => state.page);
  const setPage = useFeedStore((state) => state.setPage);
  const search = useFeedStore((state) => state.search);
  const technologies = useFeedStore((state) => state.technologies);
  const resetCount = useFeedStore((state) => state.resetCount);
  const clearFilters = useFeedStore((state) => state.clearFilters);

  // The public feed shows while Clerk is still loading, so visitors who are not
  // signed in, which is most of them, never wait on it. Signed-in users switch
  // to "For you" a moment later, unless they already picked a tab.
  const signedIn = isLoaded && isSignedIn === true;
  const view: FeedView = chosenView ?? (signedIn ? "for-you" : "latest");

  // Known only once the profile has loaded, so the note never flickers in
  // before then.
  const hasNoStack = me.data?.technologies.length === 0;

  const publicFeed = usePublicFeed(
    { page, limit: PAGE_SIZE, search, technologies },
    view === "latest",
  );
  const forYouFeed = usePersonalizedFeed(
    { page, limit: PAGE_SIZE },
    view === "for-you" && signedIn,
  );

  const hasFilters = search !== "" || technologies.length > 0;
  const changePage = (next: number) => {
    setPage(next);
    // Otherwise the new page would open scrolled to the bottom.
    window.scrollTo({ top: 0 });
  };

  return (
    <div>
      <FeedTabs view={view} onChange={setView} />

      <div
        role="tabpanel"
        id="feed-panel"
        aria-labelledby={`feed-tab-${view}`}
        className="mt-4 space-y-3"
      >
        {view === "latest" ? (
          <>
            <FeedFilters key={resetCount} />
            <FeedResults
              state={toListState(publicFeed)}
              page={page}
              onPageChange={changePage}
              emptyTitle={
                hasFilters
                  ? "No submissions match these filters"
                  : "No submissions yet"
              }
              emptyText={
                hasFilters
                  ? "Try a different search, or remove a technology."
                  : "Code posted for review will show up here."
              }
              onClearFilters={hasFilters ? clearFilters : undefined}
            />
          </>
        ) : signedIn ? (
          <>
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {hasNoStack
                ? "You have not added any technologies yet, so this feed is ordered by recency. Add your stack to rank submissions by how well they match it."
                : "Ranked by how many of a submission's technologies are in your stack, and how recent it is. Green tags match yours."}
            </p>
            <FeedResults
              state={toListState(forYouFeed)}
              page={page}
              onPageChange={changePage}
              emptyTitle="Nothing to show yet"
              emptyText="Submissions from other developers will show up here."
            />
          </>
        ) : (
          <SignInPrompt />
        )}
      </div>
    </div>
  );
}

interface FeedResultsProps {
  state: ListState;
  page: number;
  onPageChange: (page: number) => void;
  emptyTitle: string;
  emptyText: string;
  onClearFilters?: () => void;
}

function FeedResults({
  state,
  page,
  onPageChange,
  emptyTitle,
  emptyText,
  onClearFilters,
}: FeedResultsProps) {
  if (state.isError) {
    return <FeedError error={state.error} onRetry={state.refetch} />;
  }

  if (state.isPending || !state.items || !state.meta) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading submissions"
        className="space-y-3"
      >
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          <FeedItemSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (state.items.length === 0) {
    // A page past the end comes back empty, not as an error. That can happen
    // if the remembered page no longer exists.
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
          {onClearFilters && (
            <Button variant="outline" className="mt-3" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Dimmed while the next page loads, so the click visibly registers. */}
      <ul
        aria-busy={state.isPlaceholderData}
        className={cn(
          "space-y-3",
          state.isPlaceholderData && "opacity-50 transition-opacity",
        )}
      >
        {state.items.map((item) => (
          <FeedItemRow key={item.id} item={item} />
        ))}
      </ul>
      <FeedPagination
        page={state.meta.currentPage}
        totalPages={state.meta.totalPages}
        disabled={state.isPlaceholderData}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function FeedError({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  // The request id is what to quote when reporting a problem. It matches the
  // server's log lines for that request.
  const requestId = error instanceof ApiError ? error.requestId : null;

  return (
    <Card role="alert" className="gap-0 py-0">
      <CardContent className="p-4 text-sm">
        <p className="font-medium">Could not load the feed</p>
        <p className="mt-1 text-muted-foreground">
          {error?.message ?? "Something went wrong."}
        </p>
        {requestId && (
          <p className="mt-1 text-xs text-muted-foreground">
            Reference: {requestId}
          </p>
        )}
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

function SignInPrompt() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4 text-sm">
        <p className="font-medium">See submissions ranked for you</p>
        <p className="mt-1 text-muted-foreground">
          Sign in and add your technologies. The feed then ranks submissions by
          how well they match your stack, and how recent they are.
        </p>
        <Link href="/sign-in" className={cn(buttonVariants(), "mt-3")}>
          Sign in
        </Link>
      </CardContent>
    </Card>
  );
}
