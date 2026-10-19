"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The submission pages are reached from the feed, so they count as being in it.
const LINKS = [
  {
    href: "/feed",
    label: "Feed",
    isCurrent: (pathname: string) =>
      pathname === "/feed" || pathname.startsWith("/submissions"),
  },
  {
    href: "/changelog",
    label: "What's new",
    isCurrent: (pathname: string) => pathname === "/changelog",
  },
] as const;

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="ml-2 hidden gap-4 sm:flex">
      {LINKS.map((link) => {
        const current = link.isCurrent(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "text-small transition-colors",
              current
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
