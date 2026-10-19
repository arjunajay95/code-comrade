import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MeNav } from "@/components/me/MeNav";
import { SettingsForm } from "@/components/me/SettingsForm";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await auth.protect();

  return (
    <Container size="reading">
      <MeNav />
      <h1 className="mb-4 text-title font-semibold">Settings</h1>
      <SettingsForm />
    </Container>
  );
}
