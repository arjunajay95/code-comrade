"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/utils";

// The "Your post" note and the Edit action, shown to the author only. Courtesy again: the edit page and the API both
// check ownership on their own.
export function OwnerEditLink({
  submissionId,
  authorUsername,
}: {
  submissionId: number;
  authorUsername: string;
}) {
  const me = useMe();
  if (me.data?.username !== authorUsername) return null;

  return (
    <>
      {/* In place of the review section, which the author does not get. */}
      <span className="inline-flex h-5 shrink-0 items-center rounded-full border bg-muted/50 px-2 font-mono text-micro text-muted-foreground">
        Your post
      </span>
      <Link
        href={`/submissions/${submissionId}/edit`}
        className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
      >
        <Pencil className="size-4" aria-hidden />
        Edit
      </Link>
    </>
  );
}
