"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/utils";

// Shown to the author only. Courtesy again: the edit page and the API both
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
    <Link
      href={`/submissions/${submissionId}/edit`}
      className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
    >
      <Pencil className="size-4" aria-hidden />
      Edit
    </Link>
  );
}
