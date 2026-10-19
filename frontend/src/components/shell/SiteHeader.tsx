import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { LogoMark } from "@/components/brand/LogoMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "./Container";
import { HeaderNav } from "./HeaderNav";
import { KarmaBadge } from "./KarmaBadge";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur">
      <Container
        size="wide"
        verticalPadding={false}
        className="flex h-14 items-center gap-2"
      >
        <Link
          href="/"
          aria-label="CodeComrade"
          className="flex items-center gap-2"
        >
          <LogoMark className="size-7" />
          {/* Dropped below 480px so the signed-in header fits at 320px. */}
          <Wordmark className="hidden min-[480px]:inline" />
        </Link>
        <HeaderNav />

        {/* Pushes everything after it to the right edge. */}
        <div className="flex-1" />

        <ThemeToggle />

        <Show when="signed-out">
          <Link href="/sign-in" className={buttonVariants()}>
            Sign in
          </Link>
        </Show>

        <Show when="signed-in">
          <Link
            href="/submissions/new"
            aria-label="Post a request"
            className={buttonVariants()}
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
      </Container>
    </header>
  );
}
