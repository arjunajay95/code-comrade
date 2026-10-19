"use client";

import Link from "next/link";
import { ErrorCard, StateCard } from "@/components/shell/StateCard";
import { Surface } from "@/components/shell/Surface";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { useSubmission } from "@/hooks/useSubmission";
import { ApiError } from "@/services/apiClient";
import { SubmissionForm } from "./SubmissionForm";

function Notice({
  title,
  text,
  backHref,
  backLabel,
}: {
  title: string;
  text: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <StateCard title={title} text={text}>
      <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
        {backLabel}
      </Link>
    </StateCard>
  );
}

// Owner only. The page check is a courtesy: PUT /submissions/:id compares the
// author on its own and answers 403 to anyone else (AUTHORIZATION_MATRIX §3).
export function EditSubmission({ id }: { id: number }) {
  const submission = useSubmission(id);
  const me = useMe();

  // Mirrors the form's first fields: a 36px input, a 112px textarea and a
  // 36px input.
  if (submission.isPending || me.isPending) {
    return (
      <Surface className="space-y-6" aria-hidden>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-9 w-full" />
      </Surface>
    );
  }

  if (submission.isError) {
    if (
      submission.error instanceof ApiError &&
      submission.error.status === 404
    ) {
      return (
        <Notice
          title="Submission not found"
          text="It may have been removed, or the link may be wrong."
          backHref="/feed"
          backLabel="Back to feed"
        />
      );
    }
    return (
      <ErrorCard
        title="Could not load this submission"
        error={submission.error}
        onRetry={() => void submission.refetch()}
      />
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

  const data = submission.data;
  if (me.data.username !== data.author.username) {
    return (
      <Notice
        title="You can only edit your own submissions"
        text="This one was posted by someone else."
        backHref={`/submissions/${id}`}
        backLabel="Back to the submission"
      />
    );
  }

  return (
    <SubmissionForm
      mode="edit"
      submissionId={id}
      initial={{
        title: data.title,
        description: data.description,
        githubUrl: data.githubUrl,
        technologies: data.technologies.map((technology) => technology.name),
        criteria: data.criteria.map((criterion) => ({
          label: criterion.label,
        })),
      }}
    />
  );
}
