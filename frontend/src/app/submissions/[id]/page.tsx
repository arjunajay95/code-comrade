import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SubmissionDetail } from "@/components/submission/SubmissionDetail";
import { parseSubmissionId } from "@/lib/ids";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Submission" };

export default async function SubmissionPage({
  params,
}: PageProps<"/submissions/[id]">) {
  const { id: rawId } = await params;

  const id = parseSubmissionId(rawId);
  if (id === null) notFound();

  return (
    <Container size="reading">
      {/* Links to the feed instead of using history.back(), so it also works
          when the page was opened from a shared link. The feed remembers its
          page and filters, so a visitor who came from it lands back where they
          were. */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-small text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to feed
      </Link>
      <div className="mt-6">
        <SubmissionDetail id={id} />
      </div>
    </Container>
  );
}
