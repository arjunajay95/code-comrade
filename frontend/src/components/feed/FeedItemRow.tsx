import Link from "next/link";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/time";
import type { FeedItem } from "@/services/feed";
import { ReviewStatus } from "./ReviewStatus";
import { TechnologyTag } from "./TechnologyTag";

// The personalized feed adds matchedTechnologies to each item. The public
// feed does not, and there nothing is highlighted.
type RowItem = FeedItem & { matchedTechnologies?: readonly string[] };

// Heights are fixed on purpose, so FeedItemSkeleton can match them exactly:
// a 24px title line, a 48px description, a 24px tag line, a 36px author panel.
// The card's own padding and gap are zeroed, and set here instead.
export function FeedItemRow({ item }: { item: RowItem }) {
  const matched = new Set(item.matchedTechnologies);

  return (
    <li>
      <Card className="gap-0 py-0">
        <CardContent className="p-4">
          <div className="flex h-6 items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-base font-medium">
              <Link
                href={`/submissions/${item.id}`}
                className="underline-offset-4 hover:underline"
              >
                {item.title}
              </Link>
            </h2>
            <ReviewStatus status={item.status} reviewCount={item.reviewCount} />
          </div>

          <p className="mt-1 line-clamp-2 min-h-12 text-sm/6 text-muted-foreground">
            {item.description}
          </p>

          <ul className="mt-3 flex min-h-6 flex-wrap gap-1.5">
            {item.technologies.map((technology) => (
              <li key={technology.id}>
                <TechnologyTag
                  name={technology.name}
                  matched={matched.has(technology.name)}
                />
              </li>
            ))}
          </ul>

          {/* Secondary information in a nested panel, the same layering the
              preset uses inside its cards. */}
          <div className="mt-3 flex h-9 items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-foreground">
                {item.author.username}
              </span>
              <KarmaChip value={item.author.karma} size="sm" />
            </span>
            <time
              dateTime={item.createdAt}
              className="shrink-0 text-muted-foreground"
            >
              {timeAgo(item.createdAt)}
            </time>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
