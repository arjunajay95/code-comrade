import Link from "next/link";
import { LogoMark } from "@/components/brand/LogoMark";
import { Container } from "@/components/shell/Container";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container size="reading">
      <LogoMark className="size-10" />
      <h1 className="mt-6 text-title font-semibold">Page not found</h1>
      <p className="mt-2 text-body text-muted-foreground">
        This page does not exist, or it has moved.
      </p>
      <Link href="/feed" className={buttonVariants({ className: "mt-6" })}>
        Back to feed
      </Link>
    </Container>
  );
}
