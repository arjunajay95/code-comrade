import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
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
          <KarmaBadge />
          {/* Clerk's avatar menu: manage account and sign out. */}
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
