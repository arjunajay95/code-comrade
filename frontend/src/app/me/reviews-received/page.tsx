import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MeNav } from "@/components/me/MeNav";
import { ReviewsReceived } from "@/components/me/ReviewsReceived";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Reviews received" };

export default async function ReviewsReceivedPage() {
  await auth.protect();

  return (
    <Container size="reading">
      <MeNav />
      <h1 className="mb-4 text-title font-semibold">Reviews you received</h1>
      <ReviewsReceived />
    </Container>
  );
}
