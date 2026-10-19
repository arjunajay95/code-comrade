"use client";

import Link from "next/link";
import { useState } from "react";
import { FeedItemRow } from "@/components/feed/FeedItemRow";
import { FeedItemSkeleton } from "@/components/feed/FeedItemSkeleton";
import { LIST_PAGE_SIZE, PagedList } from "@/components/profile/ListViews";
import { ErrorCard } from "@/components/shell/StateCard";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { useMySubmissions } from "@/hooks/useMyLists";

// The signed-in user's own posts, as the same cards the feed shows. Every post
// here is the user's own, so the author row comes from their profile. The API
// summary carries the description, but a card without one still renders, with
// no description row, in case the API has not been deployed with it yet.
export function MyRequests() {
  const [page, setPage] = useState(1);
  const me = useMe();
  const query = useMySubmissions({ page, limit: LIST_PAGE_SIZE });

  // The cards need the author, so the list waits for the profile too.
  if (me.isError) {
    return (
      <ErrorCard
        title="Could not load your posts"
        error={me.error}
        onRetry={() => void me.refetch()}
      />
    );
  }
  if (!me.data) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading your posts"
        className="space-y-3"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <FeedItemSkeleton key={index} />
        ))}
      </div>
    );
  }
  const author = { username: me.data.username, karma: me.data.karma };

  return (
    <PagedList
      query={query}
      page={page}
      onPageChange={setPage}
      label="your posts"
      emptyTitle="You have not posted anything yet"
      emptyText="Post a repository and the criteria you want it rated on."
      emptyAction={
        <Link href="/submissions/new" className={buttonVariants()}>
          New post
        </Link>
      }
      skeleton={<FeedItemSkeleton />}
      bareItems
      renderItem={(post) => (
        <FeedItemRow
          item={{
            id: post.id,
            title: post.title,
            description: post.description,
            githubUrl: post.githubUrl,
            createdAt: post.createdAt,
            status: post.reviewCount === 0 ? "PENDING" : "REVIEWED",
            reviewCount: post.reviewCount,
            technologies: post.technologies,
            author,
          }}
          index={0}
          animateIn={false}
        />
      )}
    />
  );
}
