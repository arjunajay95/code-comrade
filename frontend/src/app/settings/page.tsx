import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MeNav } from "@/components/me/MeNav";
import { SettingsForm } from "@/components/me/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await auth.protect();

  return (
    <>
      <MeNav />
      <h1 className="mb-3 text-lg font-medium">Settings</h1>
      <SettingsForm />
    </>
  );
}
