"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ErrorCard, StateCard } from "@/components/shell/StateCard";
import { Surface } from "@/components/shell/Surface";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import type { SubmissionDetail } from "@/services/submissions";
import { ReviewForm } from "./ReviewForm";

// Which of the review states to show. All of them are courtesy (AUTHORIZATION_MATRIX
// §6): the API refuses a self-review with 403 and a second review with
// 409 whatever this component does.
export function ReviewSection({
  submission,
}: {
  submission: SubmissionDetail;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useMe();

  // A 24px heading line, then the 96px form body.
  if (!isLoaded || (isSignedIn && me.isPending)) {
    return (
      <Surface aria-hidden>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-3 h-24 w-full" />
      </Surface>
    );
  }

  if (!isSignedIn) {
    return (
      <StateCard
        title="Review this code"
        text="Sign in to write a review and earn karma."
      >
        <Link href="/sign-in" className={buttonVariants()}>
          Sign in
        </Link>
      </StateCard>
    );
  }

  if (me.isError) {
    return (
      <ErrorCard
        title="Could not check your account"
        error={me.error}
        onRetry={() => void me.refetch()}
      />
    );
  }

  const username = me.data?.username;
  const isAuthor = username === submission.author.username;
  const ownReview = submission.reviews.find(
    (review) => review.reviewer === username,
  );

  if (ownReview) {
    return (
      <StateCard
        title="You reviewed this"
        text="Your review is below. Each post can be reviewed once."
      />
    );
  }

  return (
    <ReviewForm
      submissionId={submission.id}
      criteria={submission.criteria.map(({ id, label }) => ({ id, label }))}
      disabled={isAuthor}
      notice={
        isAuthor
          ? {
              title: "This is your submission",
              text: "You cannot review your own code. Other developers can.",
            }
          : undefined
      }
    />
  );
}
