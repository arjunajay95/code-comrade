import type { Metadata } from "next";
import { Feed } from "@/components/feed/Feed";
import { Container } from "@/components/shell/Container";

export const metadata: Metadata = { title: "Feed" };

export default function FeedPage() {
  return (
    <Container size="wide">
      <h1 className="text-title font-semibold">Review requests</h1>
      <p className="mt-2 max-w-2xl text-body text-muted-foreground">
        Pick something in your stack, write a useful review, and earn karma for
        it.
      </p>
      <div className="mt-8">
        <Feed />
      </div>
    </Container>
  );
}
