import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The two actions the hero and the closing section share. Over the hero photo
// the secondary button needs its own fill, since an outline alone does not
// read as a button on every part of an image.
export function LandingActions({
  className,
  overPhoto = false,
}: {
  className?: string;
  overPhoto?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <Link href="/feed" className={buttonVariants({ size: "lg" })}>
        Browse the feed
      </Link>
      <Link
        href="/sign-up"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          overPhoto &&
            "border-foreground/25 bg-foreground/10 text-foreground backdrop-blur-sm hover:bg-foreground/20 hover:text-foreground dark:bg-foreground/10 dark:hover:bg-foreground/20",
        )}
      >
        Sign up
      </Link>
    </div>
  );
}
