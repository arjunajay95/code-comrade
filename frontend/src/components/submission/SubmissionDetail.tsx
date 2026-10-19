"use client";

import Link from "next/link";
import { ErrorCard, StateCard } from "@/components/shell/StateCard";
import { buttonVariants } from "@/components/ui/button";
import { useSubmission } from "@/hooks/useSubmission";
import { ApiError } from "@/services/apiClient";
import { OwnerEditLink } from "./OwnerEditLink";
import { ReviewSection } from "./ReviewSection";
import { SubmissionSkeleton } from "./SubmissionSkeleton";
import { SubmissionView } from "./SubmissionView";

export function SubmissionDetail({ id }: { id: number }) {
  const query = useSubmission(id);

  if (query.isPending) return <SubmissionSkeleton />;

  if (query.isError) {
    // A 404 means this submission does not exist, which is different from the
    // request failing. Only a failure is worth retrying.
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <StateCard
          title="Post not found"
          text="It may have been removed, or the link may be wrong."
        >
          <Link href="/feed" className={buttonVariants({ variant: "outline" })}>
            Back to feed
          </Link>
        </StateCard>
      );
    }

    return (
      <ErrorCard
        title="Could not load this post"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <SubmissionView
      submission={query.data}
      actions={
        <OwnerEditLink
          submissionId={query.data.id}
          authorUsername={query.data.author.username}
        />
      }
      reviewSlot={<ReviewSection submission={query.data} />}
    />
  );
}
