"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubmission } from "@/hooks/useSubmission";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/apiClient";
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
        <Card className="gap-0 py-0">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">Submission not found</p>
            <p className="mt-1 text-muted-foreground">
              It may have been removed, or the link may be wrong.
            </p>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
            >
              Back to submissions
            </Link>
          </CardContent>
        </Card>
      );
    }

    // The request id is what to quote when reporting a problem. It matches the
    // server's log lines for that request.
    const requestId =
      query.error instanceof ApiError ? query.error.requestId : null;

    return (
      <Card role="alert" className="gap-0 py-0">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Could not load this submission</p>
          <p className="mt-1 text-muted-foreground">{query.error.message}</p>
          {requestId && (
            <p className="mt-1 text-xs text-muted-foreground">
              Reference: {requestId}
            </p>
          )}
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <SubmissionView submission={query.data} />;
}
