import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MeNav } from "@/components/me/MeNav";
import { MyRequests } from "@/components/me/MyRequests";

export const metadata: Metadata = { title: "Your requests" };

export default async function MyRequestsPage() {
  await auth.protect();

  return (
    <>
      <MeNav />
      <h1 className="mb-3 text-lg font-medium">Your requests</h1>
      <MyRequests />
    </>
  );
}
