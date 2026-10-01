import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4 text-sm">
        <p className="font-medium">Page not found</p>
        <p className="mt-1 text-muted-foreground">
          This page does not exist, or it has moved.
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
        >
          Back to submissions
        </Link>
      </CardContent>
    </Card>
  );
}
