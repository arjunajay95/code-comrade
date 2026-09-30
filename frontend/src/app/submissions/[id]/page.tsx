import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SubmissionDetail } from "@/components/submission/SubmissionDetail";

export const metadata: Metadata = { title: "Submission" };

// PostgreSQL's integer maximum. The API rejects anything above it, so the page
// does too, instead of sending a request that can only fail.
const MAX_ID = 2_147_483_647;

export default async function SubmissionPage({
  params,
}: PageProps<"/submissions/[id]">) {
  const { id: rawId } = await params;

  // Digits only, so "1e3" and "0x10" are rejected instead of being read as
  // numbers by Number().
  const id = /^\d+$/.test(rawId) ? Number(rawId) : Number.NaN;
  if (!Number.isInteger(id) || id < 1 || id > MAX_ID) notFound();

  return (
    <>
      {/* Links to the feed instead of using history.back(), so it also works
          when the page was opened from a shared link. The feed remembers its
          page and filters, so a visitor who came from it lands back where they
          were. */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to submissions
      </Link>
      <div className="mt-4">
        <SubmissionDetail id={id} />
      </div>
    </>
  );
}
