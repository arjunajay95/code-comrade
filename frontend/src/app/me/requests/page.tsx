import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MeNav } from "@/components/me/MeNav";
import { MyRequests } from "@/components/me/MyRequests";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Your requests" };

export default async function MyRequestsPage() {
  await auth.protect();

  return (
    <Container size="reading">
      <MeNav />
      <h1 className="mb-4 text-title font-semibold">Your requests</h1>
      <MyRequests />
    </Container>
  );
}
