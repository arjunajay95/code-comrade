"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./navLinks";

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="ml-2 hidden gap-4 sm:flex">
      {NAV_LINKS.map((link) => {
        const current = link.isCurrent(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-sm text-small outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
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
