import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MeNav } from "@/components/me/MeNav";
import { MyProfile } from "@/components/me/MyProfile";

export const metadata: Metadata = { title: "Your profile" };

export default async function MePage() {
  await auth.protect();

  return (
    <>
      <MeNav />
      <MyProfile />
    </>
  );
}
