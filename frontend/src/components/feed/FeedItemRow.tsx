import Link from "next/link";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/services/feed";
import { TechnologyTag } from "./TechnologyTag";

// Row heights are fixed on purpose: the title truncates, and the description
// always takes two lines. FeedItemSkeleton uses the same measurements, so
// nothing below the list shifts when the data arrives.
export function FeedItemRow({ item }: { item: FeedItem }) {
  const pending = item.status === "PENDING";
  const reviews = `${item.reviewCount} ${item.reviewCount === 1 ? "review" : "reviews"}`;

  return (
    <article className="border-b py-5 first:pt-0">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="min-w-0 truncate text-base font-medium">
          <Link
            href={`/submissions/${item.id}`}
            className="underline-offset-4 hover:underline"
          >
            {item.title}
          </Link>
        </h2>
        {/* Unreviewed work is what a reviewer can act on, so it gets the
            stronger color. */}
        <span
          className={cn(
            "shrink-0 text-xs",
            pending ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {pending ? "needs a review" : reviews}
        </span>
      </div>

      <p className="mt-1 line-clamp-2 min-h-12 text-sm/6 text-muted-foreground">
        {item.description}
      </p>

      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2">
        <ul className="flex flex-wrap gap-1.5">
          {item.technologies.map((technology) => (
            <li key={technology.id}>
              <TechnologyTag name={technology.name} />
            </li>
          ))}
        </ul>
        <p className="md:ml-auto flex items-baseline gap-2 text-xs text-muted-foreground">
          <span className="text-foreground">{item.author.username}</span>
          <span className="tabular-nums text-addition" title="Author's karma">
            +{item.author.karma}
          </span>
          <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </p>
      </div>
    </article>
  );
}
