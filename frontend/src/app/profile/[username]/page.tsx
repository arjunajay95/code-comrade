import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({
  params,
}: PageProps<"/profile/[username]">) {
  const { username: rawUsername } = await params;

  // The API matches usernames case-insensitively. A string that can never be
  // a username, an encoded character included, does not need a request.
  const username = rawUsername.toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) notFound();

  return (
    <Container size="reading">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to submissions
      </Link>
      <div className="mt-4">
        <PublicProfile username={username} />
      </div>
    </Container>
  );
}
