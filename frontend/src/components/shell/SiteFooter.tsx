import Link from "next/link";
import { LogoMark } from "@/components/brand/LogoMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { Container } from "./Container";

const linkClass =
  "text-small text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <Container
        size="wide"
        verticalPadding={false}
        className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <LogoMark className="size-6" />
            <Wordmark />
          </div>
          <p className="mt-2 text-small text-muted-foreground">
            A peer code review platform built by Arjuna Jayasinghe.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/feed" className={linkClass}>
            Feed
          </Link>
          <a
            href="https://github.com/arjunajay95/code-comrade"
            className={linkClass}
          >
            Source on GitHub
          </a>
        </nav>
      </Container>
    </footer>
  );
}
