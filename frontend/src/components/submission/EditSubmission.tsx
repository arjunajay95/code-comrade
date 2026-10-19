"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { useSubmission } from "@/hooks/useSubmission";
import { cn } from "@/lib/utils";
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
    <Card className="gap-0 py-0">
      <CardContent className="p-4 text-sm">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-muted-foreground">{text}</p>
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
        >
          {backLabel}
        </Link>
      </CardContent>
    </Card>
  );
}

// Owner only. The page check is a courtesy: PUT /submissions/:id compares the
// author on its own and answers 403 to anyone else (AUTHORIZATION_MATRIX §3).
export function EditSubmission({ id }: { id: number }) {
  const submission = useSubmission(id);
  const me = useMe();

  if (submission.isPending || me.isPending) {
    return (
      <Card className="gap-0 py-0" aria-hidden>
        <CardContent className="space-y-4 p-4">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-7 w-full" />
        </CardContent>
      </Card>
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
          backHref="/"
          backLabel="Back to submissions"
        />
      );
    }
    return (
      <Card role="alert" className="gap-0 py-0">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Could not load this submission</p>
          <p className="mt-1 text-muted-foreground">
            {submission.error.message}
          </p>
          {submission.error instanceof ApiError &&
            submission.error.requestId && (
              <p className="mt-1 text-xs text-muted-foreground">
                Reference:{" "}
                <span className="font-mono">{submission.error.requestId}</span>
              </p>
            )}
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void submission.refetch()}
          >
            Try again
          </Button>
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
