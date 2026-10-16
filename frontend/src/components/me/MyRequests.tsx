"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LIST_PAGE_SIZE,
  PagedList,
  SubmissionSummaryCard,
} from "@/components/profile/ListViews";
import { buttonVariants } from "@/components/ui/button";
import { useMySubmissions } from "@/hooks/useMyLists";
import { cn } from "@/lib/utils";

export function MyRequests() {
  const [page, setPage] = useState(1);
  const query = useMySubmissions({ page, limit: LIST_PAGE_SIZE });

  return (
    <PagedList
      query={query}
      page={page}
      onPageChange={setPage}
      label="your requests"
      emptyTitle="You have not posted anything yet"
      emptyText="Post a repository and the criteria you want it rated on."
      emptyAction={
        <Link href="/submissions/new" className={cn(buttonVariants(), "mt-3")}>
          Post a request
        </Link>
      }
      renderItem={(submission) => (
        <SubmissionSummaryCard submission={submission} />
      )}
    />
  );
}
