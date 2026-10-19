"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { KarmaBadge } from "./KarmaBadge";
import { UserMenu } from "./UserMenu";

// The sign-in button or the signed-in actions, decided in the browser. Clerk's
// server-side Show would read the session with auth(), which makes every page
// that renders the header dynamic, and the landing page must be static.
//
// Until Clerk has loaded, the Sign in button holds the space, invisible, since
// most visitors are signed out. A signed-out visitor sees it appear without
// anything moving, and a signed-in visitor never sees a button they cannot use.
export function HeaderAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <Link
        href="/sign-in"
        aria-hidden
        tabIndex={-1}
        className={buttonVariants({ className: "invisible" })}
      >
        Sign in
      </Link>
    );
  }

  if (!isSignedIn) {
    return (
      <Link href="/sign-in" className={buttonVariants()}>
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/submissions/new"
        aria-label="New post"
        className={buttonVariants()}
      >
        <Plus aria-hidden />
        {/* Icon only on the narrowest screens, so the header fits at 320px. */}
        <span className="hidden min-[400px]:inline">New post</span>
      </Link>
      <KarmaBadge />
      {/* Clerk's avatar menu, with an extra item for editing the stack. */}
      <UserMenu />
    </>
  );
}
