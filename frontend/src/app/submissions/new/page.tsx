import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Post a request" };

export default async function NewSubmissionPage() {
  // Sends a signed-out visitor to sign in. A courtesy: POST /submissions
  // answers 401 on its own (AUTHORIZATION_MATRIX §6).
  await auth.protect();

  return (
    <Container size="reading">
      <h1 className="text-lg font-medium">Post a request for review</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Link a public GitHub repository, say what you want looked at, and define
        what reviewers rate.
      </p>
      <div className="mt-4">
        <SubmissionForm mode="create" />
      </div>
    </Container>
  );
}
