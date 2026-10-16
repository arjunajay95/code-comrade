import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import { EditSubmission } from "@/components/submission/EditSubmission";
import { parseSubmissionId } from "@/lib/ids";

export const metadata: Metadata = { title: "Edit request" };

export default async function EditSubmissionPage({
  params,
}: PageProps<"/submissions/[id]/edit">) {
  const { id: rawId } = await params;

  const id = parseSubmissionId(rawId);
  if (id === null) notFound();

  await auth.protect();

  return (
    <>
      <Link
        href={`/submissions/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to the submission
      </Link>
      <h1 className="mt-4 text-lg font-medium">Edit your request</h1>
      <div className="mt-4">
        <EditSubmission id={id} />
      </div>
    </>
  );
}
