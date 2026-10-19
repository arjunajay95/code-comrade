"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { MonogramAvatar } from "@/components/profile/MonogramAvatar";
import { Surface } from "@/components/shell/Surface";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANGELOG } from "@/content/changelog";
import { useMe } from "@/hooks/useMe";
import { useMySubmissions } from "@/hooks/useMyLists";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { SubmissionSummary } from "@/services/users";

const monthHeading = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// The posts arrive newest first, so a new heading starts wherever the month
// changes.
function groupByMonth(posts: SubmissionSummary[]) {
  const groups: { heading: string; posts: SubmissionSummary[] }[] = [];
  for (const post of posts) {
    const heading = monthHeading.format(new Date(post.createdAt));
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.posts.push(post);
    else groups.push({ heading, posts: [post] });
  }
  return groups;
}

const LABEL = "text-micro uppercase tracking-wider text-muted-foreground";

function PostRow({ post }: { post: SubmissionSummary }) {
  return (
    <li>
      <Link
        href={`/submissions/${post.id}`}
        className="block rounded-md py-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="block truncate text-small">{post.title}</span>
        <span className="mt-0.5 flex h-4 items-center gap-1.5 font-mono text-micro text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              post.reviewCount === 0 ? "bg-pending" : "bg-addition",
            )}
          />
          {post.reviewCount} {post.reviewCount === 1 ? "review" : "reviews"}
          <span aria-hidden>&middot;</span>
          {timeAgo(post.createdAt)}
        </span>
      </Link>
    </li>
  );
}

// Three month groups of two rows, as tall as the real list.
function PostsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your posts" className="space-y-5">
      {Array.from({ length: 2 }, (_, group) => (
        <div key={group}>
          <Skeleton className="h-4 w-24" />
          <div className="mt-2 space-y-2">
            {Array.from({ length: 2 }, (_, row) => (
              <div key={row} className="h-[44px]">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="mt-0.5 h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SignedInAside() {
  const me = useMe();
  const posts = useMySubmissions({ page: 1, limit: 20 });

  return (
    <div>
      <div className="flex items-center gap-2">
        {me.data && <MonogramAvatar username={me.data.username} size={20} />}
        <span className="min-w-0 truncate text-small">
          {me.data?.username ?? " "}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <h2 className={LABEL}>
          Your posts
          {posts.data && (
            <span className="ml-1.5 font-mono">
              {posts.data.meta.totalItems}
            </span>
          )}
        </h2>
        <Link
          href="/submissions/new"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Plus aria-hidden />
          New post
        </Link>
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
              className={cn(buttonVariants(), "mt-3")}
            >
              New post
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {groupByMonth(posts.data.items).map((group) => (
              <section key={group.heading} aria-label={group.heading}>
                <h3 className={LABEL}>{group.heading}</h3>
                <ul className="mt-1 space-y-1">
                  {group.posts.map((post) => (
                    <PostRow key={post.id} post={post} />
                  ))}
                </ul>
              </section>
            ))}
            <Link
              href="/me/posts"
              className="inline-block rounded-sm text-small text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              See all your posts
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

const STEPS = [
  "Create a post with your repository",
  "Review someone else's code",
  "Get a feed that fits your stack",
];

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// Static, with no API call: a short version of the landing page and the newest
// changelog entry.
function SignedOutAside() {
  const newest = CHANGELOG[0];

  return (
    <div className="space-y-4">
      <Surface glass className="p-4">
        <h2 className="text-body font-medium">How CodeComrade works</h2>
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

      <Link
        href="/changelog"
        className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className={LABEL}>What&apos;s new</span>
        <span className="mt-1 block font-mono text-micro text-muted-foreground">
          {dateFormat.format(new Date(`${newest.date}T00:00:00Z`))}
        </span>
        <span className="block text-small underline-offset-4 hover:underline">
          {newest.title}
        </span>
      </Link>
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
