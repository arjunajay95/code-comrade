"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers } from "lucide-react";
import {
  LIST_PAGE_SIZE,
  PagedList,
  ReviewSummaryCard,
} from "@/components/profile/ListViews";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { useMyReviews } from "@/hooks/useMyLists";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/apiClient";
import { useUiStore } from "@/stores/uiStore";

// The signed-in user's own profile, then the reviews they have written.
export function MyProfile() {
  const me = useMe();
  const openStackPicker = useUiStore((state) => state.openStackPicker);
  const [page, setPage] = useState(1);
  const reviews = useMyReviews({ page, limit: LIST_PAGE_SIZE });

  return (
    <div className="space-y-6">
      {me.isPending ? (
        <Card className="gap-0 py-0" aria-hidden>
          <CardContent className="p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-24" />
            <Skeleton className="mt-4 h-6 w-2/3" />
            <Skeleton className="mt-4 h-16 w-full" />
          </CardContent>
        </Card>
      ) : me.isError ? (
        <Card role="alert" className="gap-0 py-0">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">Could not load your profile</p>
            <p className="mt-1 text-muted-foreground">{me.error.message}</p>
            {me.error instanceof ApiError && me.error.requestId && (
              <p className="mt-1 text-xs text-muted-foreground">
                Reference:{" "}
                <span className="font-mono">{me.error.requestId}</span>
              </p>
            )}
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => void me.refetch()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ProfileCard
          profile={me.data}
          actions={
            <>
              <Link
                href={`/profile/${me.data.username}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                View public profile
              </Link>
              <Link
                href="/settings"
                className={cn(buttonVariants({ variant: "outline" }))}
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
        <h2 id="given-heading" className="mb-3 text-sm font-medium">
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
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
            >
              Browse submissions
            </Link>
          }
          renderItem={(review) => <ReviewSummaryCard review={review} />}
        />
      </section>
    </div>
  );
}
