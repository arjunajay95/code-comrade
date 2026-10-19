"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The submission pages are reached from the feed, so they count as being in it.
const isFeedPath = (pathname: string) =>
  pathname === "/feed" || pathname.startsWith("/submissions");

export function HeaderNav() {
  const pathname = usePathname();
  const current = isFeedPath(pathname);

  return (
    <nav aria-label="Main" className="ml-2 hidden sm:block">
      <Link
        href="/feed"
        aria-current={current ? "page" : undefined}
        className={cn(
          "text-small transition-colors",
          current
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Feed
      </Link>
    </nav>
  );
}
