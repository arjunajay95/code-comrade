"use client";

import Link from "next/link";
import { ErrorCard, StateCard } from "@/components/shell/StateCard";
import { buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { ApiError } from "@/services/apiClient";
import { ProfileCard, ProfileCardSkeleton } from "./ProfileCard";

export function PublicProfile({ username }: { username: string }) {
  const query = useProfile(username);

  if (query.isPending) return <ProfileCardSkeleton />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <StateCard
          title="User not found"
          text={`No one has the username "${username}".`}
        >
          <Link href="/feed" className={buttonVariants({ variant: "outline" })}>
            Back to feed
          </Link>
        </StateCard>
      );
    }

    return (
      <ErrorCard
        title="Could not load this profile"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return <ProfileCard profile={query.data} />;
}
