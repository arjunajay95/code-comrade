"use client";

import Link from "next/link";
import * as m from "motion/react-m";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { timeAgo } from "@/lib/time";
import type { FeedItem } from "@/services/feed";
import { ReviewStatus } from "./ReviewStatus";
import { TechnologyTagRow } from "./TechnologyTagRow";

// The personalized feed adds matchedTechnologies to each item. The public
// feed does not, and there nothing is highlighted.
type RowItem = FeedItem & { matchedTechnologies?: readonly string[] };

// The stagger stops growing after the tenth card, so a long page never waits.
const STAGGER_SECONDS = 0.03;
const STAGGER_LIMIT = 9;

// Heights are fixed on purpose, so FeedItemSkeleton can match them exactly:
// a 24px title line, a 48px description, a 24px tag line, and a 37px author
// row (1px border, 12px padding, a 24px line). With the 20px padding and the
// 1px border around it, a card is 215px tall at every width.
export function FeedItemRow({
  item,
  index,
  animateIn,
}: {
  item: RowItem;
  index: number;
  // False for the first list after the page loads, which can hold the LCP
  // element, so it must not start at zero opacity.
  animateIn: boolean;
}) {
  const matched = new Set(item.matchedTechnologies);

  return (
    <m.li
      initial={animateIn ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
        delay: Math.min(index, STAGGER_LIMIT) * STAGGER_SECONDS,
      }}
      className="relative rounded-xl border bg-card/60 p-5 transition-colors hover:border-foreground/20 hover:bg-card has-[[data-card-link]:focus-visible]:ring-2 has-[[data-card-link]:focus-visible]:ring-ring/50"
    >
      <div className="flex h-6 items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-heading font-medium">
          {/* The ::after covers the whole card, so a click anywhere opens the
              submission. The author link and the status sit above it. */}
          <Link
            href={`/submissions/${item.id}`}
            data-card-link
            className="underline-offset-4 outline-none after:absolute after:inset-0 hover:underline"
          >
            {item.title}
          </Link>
        </h2>
        <span className="relative z-10 shrink-0">
          <ReviewStatus status={item.status} reviewCount={item.reviewCount} />
        </span>
      </div>

      <p className="mt-2 line-clamp-2 h-12 text-body text-muted-foreground">
        {item.description}
      </p>

      <TechnologyTagRow
        technologies={item.technologies}
        matchedNames={matched}
        className="mt-4"
      />

      <div className="mt-4 border-t pt-3">
        <div className="flex h-6 items-center gap-2">
          <Link
            href={`/profile/${item.author.username}`}
            className="relative z-10 min-w-0 truncate text-small text-foreground underline-offset-4 hover:underline"
          >
            {item.author.username}
          </Link>
          <KarmaChip value={item.author.karma} size="sm" />
          <span aria-hidden className="text-muted-foreground">
            &middot;
          </span>
          <time
            dateTime={item.createdAt}
            className="shrink-0 font-mono text-micro text-muted-foreground"
          >
            {timeAgo(item.createdAt)}
          </time>
        </div>
      </div>
    </m.li>
  );
}
