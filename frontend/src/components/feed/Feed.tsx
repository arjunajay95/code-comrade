"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useReducedMotion } from "motion/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { usePersonalizedFeed, usePublicFeed } from "@/hooks/useFeed";
import { cn } from "@/lib/utils";
import type { FeedItem, PageMeta } from "@/services/feed";
import { useFeedStore, type FeedView } from "@/stores/feedStore";
import { ErrorCard, StateCard } from "@/components/shell/StateCard";
import { FeedFilters } from "./FeedFilters";
import { FeedRightAside } from "./FeedRightAside";
import { FeedItemRow } from "./FeedItemRow";
import { FeedItemSkeleton } from "./FeedItemSkeleton";
import { FeedPagination } from "./FeedPagination";
import { FeedTabs } from "./FeedTabs";
import { YourStack } from "./YourStack";

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

  const publicFeed = usePublicFeed(
    { page, limit: PAGE_SIZE, search, technologies },
    view === "latest",
  );
  const forYouFeed = usePersonalizedFeed(
    { page, limit: PAGE_SIZE, search, technologies },
    view === "for-you" && signedIn,
  );

  const hasFilters = search !== "" || technologies.length > 0;
  const changePage = (next: number) => {
    setPage(next);
    // Otherwise the new page would open scrolled to the bottom.
    window.scrollTo({ top: 0 });
  };

  // What belongs to the current tab sits beside the list at lg and above, and
  // between the tabs and the list below it. It carries its own label instead
  // of living in the tab panel, so the panel holds only the list.
  const sidebar =
    view === "for-you" && !signedIn ? null : (
      <aside
        aria-label="Filters"
        className="mt-4 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start lg:sticky lg:top-20"
      >
        {view === "for-you" && <YourStack />}
        <FeedFilters key={resetCount} />
      </aside>
    );

  return (
    <div className="lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-x-10 xl:grid-cols-[15.5rem_minmax(0,1fr)_15.5rem] xl:gap-x-8">
      <div className="lg:col-start-2 lg:row-start-1">
        <FeedTabs view={view} onChange={setView} />
      </div>

      {sidebar}

      <FeedRightAside signedIn={signedIn} />

      <div
        role="tabpanel"
        id="feed-panel"
        aria-labelledby={`feed-tab-${view}`}
        className="mt-4 lg:col-start-2 lg:row-start-2"
      >
        {view === "latest" ? (
          <FeedResults
            state={toListState(publicFeed)}
            page={page}
            onPageChange={changePage}
            emptyTitle={
              hasFilters ? "No posts match these filters" : "No posts yet"
            }
            emptyText={
              hasFilters
                ? "Try a different search, or remove a technology."
                : "Code posted for review will show up here."
            }
            onClearFilters={hasFilters ? clearFilters : undefined}
          />
        ) : signedIn ? (
          <FeedResults
            state={toListState(forYouFeed)}
            page={page}
            onPageChange={changePage}
            emptyTitle={
              hasFilters
                ? "No posts match these filters"
                : "Nothing to show yet"
            }
            emptyText={
              hasFilters
                ? "Try a different search, or remove a technology."
                : "Posts from other developers will show up here."
            }
            onClearFilters={hasFilters ? clearFilters : undefined}
          />
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
  const reduceMotion = useReducedMotion();

  // The first list after the page loads renders with no entrance, because its
  // first card can be the LCP element. Every list after it, whether from a
  // filter, a search, a tab or a page change, enters. The same component
  // stays mounted across tabs, so a tab change counts as a later list.
  // Lists are told apart by their ids, so the dimmed previous page, which is
  // the same list, is not counted again.
  const listKey =
    state.items && state.items.length > 0
      ? state.items.map((item) => item.id).join(",")
      : null;
  const [seen, setSeen] = useState({ key: null as string | null, count: 0 });
  if (listKey !== null && listKey !== seen.key) {
    setSeen({ key: listKey, count: seen.count + 1 });
  }
  const animateIn = seen.count > 1 && !reduceMotion;

  if (state.isError) {
    return (
      <ErrorCard
        title="Could not load the feed"
        error={state.error}
        onRetry={state.refetch}
      />
    );
  }

  if (state.isPending || !state.items || !state.meta) {
    return (
      <div aria-busy="true" aria-label="Loading posts" className="space-y-3">
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
        <StateCard title="There is nothing on this page.">
          <Button variant="outline" onClick={() => onPageChange(1)}>
            Back to page 1
          </Button>
        </StateCard>
      );
    }
    return (
      <StateCard title={emptyTitle} text={emptyText}>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </StateCard>
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
        {state.items.map((item, index) => (
          <FeedItemRow
            key={item.id}
            item={item}
            index={index}
            animateIn={animateIn}
          />
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

function SignInPrompt() {
  return (
    <StateCard
      title="See posts ranked for you"
      text="Sign in and add your technologies. The feed then ranks posts by how well they match your stack, and how recent they are."
    >
      <Link href="/sign-in" className={buttonVariants()}>
        Sign in
      </Link>
    </StateCard>
  );
}
