import { Feed } from "@/components/feed/Feed";

export default function Home() {
  return (
    <>
      <h1 className="text-lg font-medium">Submissions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Developers post code for feedback, and earn karma by reviewing each
        other&apos;s work.
      </p>
      <div className="mt-6">
        <Feed />
      </div>
    </>
  );
}
