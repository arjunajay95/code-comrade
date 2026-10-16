"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/me", label: "Profile" },
  { href: "/me/requests", label: "My requests" },
  { href: "/me/reviews-received", label: "Reviews received" },
  { href: "/settings", label: "Settings" },
] as const;

// The signed-in user's own pages. Wraps on a narrow screen instead of
// scrolling sideways.
export function MeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Your account" className="mb-4 flex flex-wrap gap-1.5">
      {LINKS.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-2 text-xs",
              current
                ? "border-addition/40 bg-addition/10 text-addition"
                : "bg-muted/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
