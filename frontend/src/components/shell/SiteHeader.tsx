import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { buttonVariants } from "@/components/ui/button";
import { KarmaBadge } from "./KarmaBadge";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <Link href="/" className="text-sm font-medium">
          <span className="text-muted-foreground">~/</span>codecomrade
        </Link>

        {/* Pushes everything after it to the right edge. */}
        <div className="flex-1" />

        <ThemeToggle />

        <Show when="signed-out">
          <Link href="/sign-in" className={buttonVariants({ size: "sm" })}>
            Sign in
          </Link>
        </Show>

        <Show when="signed-in">
          <Link
            href="/submissions/new"
            aria-label="Post a request"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus aria-hidden />
            {/* Icon only on the narrowest screens, so the header fits at
                320px. */}
            <span className="hidden min-[400px]:inline">New request</span>
          </Link>
          <KarmaBadge />
          {/* Clerk's avatar menu, with an extra item for editing the stack. */}
          <UserMenu />
        </Show>
      </div>
    </header>
  );
}
