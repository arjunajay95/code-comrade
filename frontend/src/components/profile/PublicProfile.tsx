"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/apiClient";
import { ProfileCard } from "./ProfileCard";

export function PublicProfile({ username }: { username: string }) {
  const query = useProfile(username);

  if (query.isPending) {
    return (
      <Card className="gap-0 py-0" aria-hidden>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-24" />
          <Skeleton className="mt-4 h-6 w-2/3" />
          <Skeleton className="mt-4 h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <Card className="gap-0 py-0">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">User not found</p>
            <p className="mt-1 text-muted-foreground">
              No one has the username &quot;{username}&quot;.
            </p>
            <Link
              href="/feed"
              className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
            >
              Back to submissions
            </Link>
          </CardContent>
        </Card>
      );
    }

    const requestId =
      query.error instanceof ApiError ? query.error.requestId : null;
    return (
      <Card role="alert" className="gap-0 py-0">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Could not load this profile</p>
          <p className="mt-1 text-muted-foreground">{query.error.message}</p>
          {requestId && (
            <p className="mt-1 text-xs text-muted-foreground">
              Reference: <span className="font-mono">{requestId}</span>
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

  return <ProfileCard profile={query.data} />;
}
