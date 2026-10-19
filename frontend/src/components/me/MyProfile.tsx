"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers } from "lucide-react";
import {
  LIST_PAGE_SIZE,
  PagedList,
  ReviewSummaryCard,
  ReviewSummarySkeleton,
} from "@/components/profile/ListViews";
import {
  ProfileCard,
  ProfileCardSkeleton,
} from "@/components/profile/ProfileCard";
import { ErrorCard } from "@/components/shell/StateCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { useMyReviews } from "@/hooks/useMyLists";
import { useUiStore } from "@/stores/uiStore";

// The signed-in user's own profile, then the reviews they have written.
export function MyProfile() {
  const me = useMe();
  const openStackPicker = useUiStore((state) => state.openStackPicker);
  const [page, setPage] = useState(1);
  const reviews = useMyReviews({ page, limit: LIST_PAGE_SIZE });

  return (
    <div className="space-y-8">
      {me.isPending ? (
        <ProfileCardSkeleton withActions />
      ) : me.isError ? (
        <ErrorCard
          title="Could not load your profile"
          error={me.error}
          onRetry={() => void me.refetch()}
        />
      ) : (
        <ProfileCard
          profile={me.data}
          actions={
            <>
              <Link
                href={`/profile/${me.data.username}`}
                className={buttonVariants({ variant: "outline" })}
              >
                View public profile
              </Link>
              <Link
                href="/settings"
                className={buttonVariants({ variant: "outline" })}
              >
                Edit profile
              </Link>
              <Button variant="outline" onClick={openStackPicker}>
                <Layers aria-hidden />
                Edit stack
              </Button>
            </>
          }
        />
      )}

      <section aria-labelledby="given-heading">
        <h2 id="given-heading" className="mb-4 text-heading font-medium">
          Reviews you have written
        </h2>
        <PagedList
          query={reviews}
          page={page}
          onPageChange={setPage}
          label="your reviews"
          emptyTitle="You have not reviewed anything yet"
          emptyText="Every review you write earns karma. Pick a submission from the feed."
          emptyAction={
            <Link
              href="/feed"
              className={buttonVariants({ variant: "outline" })}
            >
              Browse submissions
            </Link>
          }
          skeleton={<ReviewSummarySkeleton />}
          renderItem={(review) => <ReviewSummaryCard review={review} />}
        />
      </section>
    </div>
  );
}
