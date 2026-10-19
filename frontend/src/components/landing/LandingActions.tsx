import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The two actions the hero and the closing section share.
export function LandingActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <Link href="/feed" className={buttonVariants({ size: "lg" })}>
        Browse the feed
      </Link>
      <Link
        href="/sign-up"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Sign up
      </Link>
    </div>
  );
}
