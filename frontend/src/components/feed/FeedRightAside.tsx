"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Surface } from "@/components/shell/Surface";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANGELOG } from "@/content/changelog";
import { useMySubmissions } from "@/hooks/useMyLists";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { SubmissionSummary } from "@/services/users";

// Both asides are timelines with one look: a 1px rail, items indented from it,
// and a dot on the rail at each item. Every row is the same height whatever
// its text, and the skeletons use the same classes, so nothing shifts when the
// data arrives (D-36).
const TITLE = "text-heading font-medium";
const MONTH =
  "flex h-5 items-center font-mono text-micro uppercase text-muted-foreground";
const ROW_LINK =
  "block h-[68px] rounded-md px-2 py-1.5 -mx-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none";
const ITEM_TITLE = "line-clamp-2 h-10 text-small";
const ITEM_META = "block h-4 font-mono text-micro text-muted-foreground";
const FOOTER_LINK =
  "inline-flex items-center gap-1 rounded-sm text-small text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

// The rail is a pseudo-element, so the dots sit on it by absolute position.
function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="relative pl-5 before:absolute before:top-0 before:bottom-0 before:left-[3px] before:w-px before:bg-border">
      {children}
    </div>
  );
}

function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-3 -left-5 size-[7px] rounded-full ring-2 ring-background",
        className,
      )}
    />
  );
}

const monthLabel = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// The posts arrive newest first, so a new month starts wherever it changes.
function groupByMonth(posts: SubmissionSummary[]) {
  const groups: { label: string; posts: SubmissionSummary[] }[] = [];
  for (const post of posts) {
    const label = monthLabel.format(new Date(post.createdAt));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.posts.push(post);
    else groups.push({ label, posts: [post] });
  }
  return groups;
}

function PostRow({ post }: { post: SubmissionSummary }) {
  return (
    <li className="relative">
      <Dot className={post.reviewCount === 0 ? "bg-pending" : "bg-addition"} />
      <Link href={`/submissions/${post.id}`} className={ROW_LINK}>
        <span className={cn(ITEM_TITLE, "font-medium")}>{post.title}</span>
        <span className={ITEM_META}>
          {post.reviewCount} {post.reviewCount === 1 ? "review" : "reviews"}
          <span aria-hidden> &middot; </span>
          {timeAgo(post.createdAt)}
        </span>
      </Link>
    </li>
  );
}

function PostsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your posts">
      <Rail>
        <Skeleton className="my-[2px] h-4 w-20" />
        {Array.from({ length: 2 }, (_, row) => (
          <div key={row} className="relative h-[68px] py-1.5">
            <Dot className="bg-muted" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="mt-[22px] h-4 w-1/2" />
          </div>
        ))}
      </Rail>
    </div>
  );
}

function SignedInAside() {
  const posts = useMySubmissions({ page: 1, limit: 20 });

  return (
    <section aria-labelledby="my-posts-heading">
      <div className="flex h-7 items-center gap-2">
        <h2 id="my-posts-heading" className={TITLE}>
          My posts
        </h2>
        {posts.data && (
          <span className="rounded-full border px-2 font-mono text-micro text-muted-foreground">
            {posts.data.meta.totalItems}
          </span>
        )}
      </div>

      <div className="mt-3">
        {posts.isPending ? (
          <PostsSkeleton />
        ) : posts.isError ? (
          <div role="alert" className="text-small text-muted-foreground">
            <p>Could not load your posts.</p>
            <button
              type="button"
              onClick={() => void posts.refetch()}
              className="mt-1 rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Try again
            </button>
          </div>
        ) : posts.data.items.length === 0 ? (
          <div className="text-small text-muted-foreground">
            <p>You have not published anything yet.</p>
            <Link
              href="/submissions/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-3")}
            >
              New post
            </Link>
          </div>
        ) : (
          <>
            <Rail>
              {groupByMonth(posts.data.items).map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <h3 className={MONTH}>{group.label}</h3>
                  <ul>
                    {group.posts.map((post) => (
                      <PostRow key={post.id} post={post} />
                    ))}
                  </ul>
                </section>
              ))}
            </Rail>
            <Link href="/me/posts" className={cn(FOOTER_LINK, "mt-3")}>
              All my posts
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

const STEPS = [
  "Create a post with your repository",
  "Review someone else's code",
  "Get a feed that fits your stack",
];

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// Static, with no API call: a short version of the landing page and the newest
// changelog entries.
function SignedOutAside() {
  return (
    <div className="space-y-6">
      <Surface glass className="p-4">
        <h2 className={cn(TITLE, "flex flex-wrap items-baseline gap-x-1.5")}>
          How <Wordmark /> works
        </h2>
        <ol className="mt-3 space-y-2 text-small text-muted-foreground">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="font-mono text-micro leading-5">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <Link
          href="/sign-up"
          className={cn(buttonVariants({ size: "sm" }), "mt-4")}
        >
          Sign up
        </Link>
      </Surface>

      <section aria-labelledby="whats-new-heading">
        <h2 id="whats-new-heading" className={cn(TITLE, "mb-3")}>
          What&apos;s new
        </h2>
        <Rail>
          <ul>
            {CHANGELOG.slice(0, 3).map((entry) => (
              <li key={entry.date} className="relative">
                <Dot className="bg-muted-foreground/60" />
                <Link href={`/changelog#${entry.date}`} className={ROW_LINK}>
                  <span className={ITEM_META}>
                    {dateFormat.format(new Date(`${entry.date}T00:00:00Z`))}
                  </span>
                  <span className={cn(ITEM_TITLE, "mt-0.5")}>
                    {entry.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Rail>
        <Link href="/changelog" className={cn(FOOTER_LINK, "mt-3")}>
          Full changelog
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </section>
    </div>
  );
}

export function FeedRightAside({ signedIn }: { signedIn: boolean }) {
  return (
    <aside
      aria-label={signedIn ? "Your posts" : "About CodeComrade"}
      className="hidden xl:sticky xl:top-20 xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:block xl:self-start"
    >
      {signedIn ? <SignedInAside /> : <SignedOutAside />}
    </aside>
  );
}
