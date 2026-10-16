"use client";

import { useState } from "react";
import {
  LIST_PAGE_SIZE,
  PagedList,
  ReviewSummaryCard,
} from "@/components/profile/ListViews";
import { useReviewsReceived } from "@/hooks/useMyLists";

export function ReviewsReceived() {
  const [page, setPage] = useState(1);
  const query = useReviewsReceived({ page, limit: LIST_PAGE_SIZE });

  return (
    <PagedList
      query={query}
      page={page}
      onPageChange={setPage}
      label="reviews you received"
      emptyTitle="No reviews yet"
      emptyText="Reviews of your submissions will show up here, newest first."
      renderItem={(review) => <ReviewSummaryCard review={review} />}
    />
  );
}
