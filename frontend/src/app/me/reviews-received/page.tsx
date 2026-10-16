import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MeNav } from "@/components/me/MeNav";
import { ReviewsReceived } from "@/components/me/ReviewsReceived";

export const metadata: Metadata = { title: "Reviews received" };

export default async function ReviewsReceivedPage() {
  await auth.protect();

  return (
    <>
      <MeNav />
      <h1 className="mb-3 text-lg font-medium">Reviews you received</h1>
      <ReviewsReceived />
    </>
  );
}
