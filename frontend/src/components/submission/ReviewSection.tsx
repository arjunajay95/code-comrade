"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/utils";
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

  if (!isLoaded || (isSignedIn && me.isPending)) {
    return (
      <Card className="gap-0 py-0" aria-hidden>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isSignedIn) {
    return (
      <Card className="gap-0 py-0">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Review this code</p>
          <p className="mt-1 text-muted-foreground">
            Sign in to write a review and earn karma.
          </p>
          <Link href="/sign-in" className={cn(buttonVariants(), "mt-3")}>
            Sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (me.isError) {
    return (
      <Card role="alert" className="gap-0 py-0">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Could not check your account</p>
          <p className="mt-1 text-muted-foreground">{me.error.message}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void me.refetch()}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const username = me.data?.username;
  const isAuthor = username === submission.author.username;
  const ownReview = submission.reviews.find(
    (review) => review.reviewer === username,
  );

  if (ownReview) {
    return (
      <Card className="gap-0 py-0">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">You reviewed this</p>
          <p className="mt-1 text-muted-foreground">
            Your review is below. Each submission can be reviewed once.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {isAuthor && (
        <Card className="gap-0 py-0">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">This is your submission</p>
            <p className="mt-1 text-muted-foreground">
              You cannot review your own code. Other developers can.
            </p>
          </CardContent>
        </Card>
      )}
      <ReviewForm
        submissionId={submission.id}
        criteria={submission.criteria.map(({ id, label }) => ({ id, label }))}
        disabled={isAuthor}
      />
    </div>
  );
}
