import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "New post" };

export default async function NewSubmissionPage() {
  // Sends a signed-out visitor to sign in. A courtesy: POST /submissions
  // answers 401 on its own (AUTHORIZATION_MATRIX §6).
  await auth.protect();

  return (
    <Container size="reading">
      <h1 className="text-title font-semibold">New post</h1>
      <p className="mt-2 text-body text-muted-foreground">
        Link a public GitHub repository, say what you want looked at, and define
        what reviewers rate.
      </p>
      <div className="mt-6">
        <SubmissionForm mode="create" />
      </div>
    </Container>
  );
}
