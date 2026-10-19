import Link from "next/link";
import { LogoMark } from "@/components/brand/LogoMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Container } from "./Container";
import { HeaderFrame } from "./HeaderFrame";
import { HeaderNav } from "./HeaderNav";
import { HeaderAuth } from "./HeaderAuth";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <HeaderFrame>
      <Container
        size="wide"
        verticalPadding={false}
        className="flex h-14 items-center gap-2"
      >
        <Link
          href="/"
          aria-label="CodeComrade"
          className="flex items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <LogoMark className="size-7" />
          {/* Dropped below 480px so the signed-in header fits at 320px. */}
          <Wordmark className="hidden min-[480px]:inline" />
        </Link>
        <HeaderNav />

        {/* Pushes everything after it to the right edge. */}
        <div className="flex-1" />

        {/* Below sm the menu holds the theme switch, so it leaves the header. */}
        <MobileMenu />
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        <HeaderAuth />
      </Container>
    </HeaderFrame>
  );
}
