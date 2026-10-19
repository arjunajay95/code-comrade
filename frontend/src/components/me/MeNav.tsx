"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/me", label: "Profile" },
  { href: "/me/posts", label: "My Posts" },
  { href: "/me/reviews-received", label: "Reviews received" },
  { href: "/settings", label: "Settings" },
] as const;

// The signed-in user's own pages, styled like the feed tabs. The nav remounts
// on every route, so the active pill is a plain background and does not slide.
// It wraps on a narrow screen instead of scrolling sideways.
export function MeNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Your account"
      className="mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1"
    >
      {LINKS.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-7 items-center rounded-md px-3 text-small outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              current
                ? "bg-background text-foreground ring-1 ring-foreground/10"
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
