import Link from "next/link";
import type { ReactNode } from "react";
import { TechnologyTag } from "@/components/feed/TechnologyTag";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { Surface } from "@/components/shell/Surface";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// What both the public profile and the signed-in user's own profile carry.
interface ProfileData {
  username: string;
  bio: string | null;
  karma: number;
  createdAt: string;
  technologies: { id: number; name: string }[];
  stats: { submissions: number; reviewsGiven: number; reviewsReceived: number };
}

const joined = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

export function ProfileCard({
  profile,
  actions,
  avatar,
  statLinks,
}: {
  profile: ProfileData;
  actions?: ReactNode;
  // A 64px picture or monogram above the username.
  avatar?: ReactNode;
  // Where each number leads, for the signed-in user's own profile.
  statLinks?: { posts: string; given: string; received: string };
}) {
  return (
    <Surface>
      {avatar && <div className="mb-4">{avatar}</div>}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold [overflow-wrap:anywhere]">
            {profile.username}
          </h1>
          <p className="mt-1 font-mono text-small text-muted-foreground">
            Joined {joined.format(new Date(profile.createdAt))}
          </p>
        </div>
        <KarmaChip value={profile.karma} />
      </div>

      {profile.bio && (
        <p
          className={cn(
            "mt-4 whitespace-pre-line text-body text-muted-foreground",
            "[overflow-wrap:anywhere]",
          )}
        >
          {profile.bio}
        </p>
      )}

      <ul
        aria-label="Technologies"
        className="mt-4 flex min-h-6 flex-wrap gap-1.5"
      >
        {profile.technologies.length === 0 ? (
          <li className="text-small text-muted-foreground">
            No technologies listed.
          </li>
        ) : (
          profile.technologies.map((technology) => (
            <li key={technology.id}>
              <TechnologyTag name={technology.name} />
            </li>
          ))
        )}
      </ul>

      {/* A hairline, not a panel, sets the numbers apart. */}
      <dl className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center">
        <Stat
          label="Posts"
          value={profile.stats.submissions}
          href={statLinks?.posts}
        />
        <Stat
          label="Reviews given"
          value={profile.stats.reviewsGiven}
          href={statLinks?.given}
        />
        <Stat
          label="Reviews received"
          value={profile.stats.reviewsReceived}
          href={statLinks?.received}
        />
      </dl>

      {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
    </Surface>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-md py-1",
        href && "transition-colors hover:bg-muted/60",
      )}
    >
      <dd className="font-mono text-heading font-medium tabular-nums">
        {value}
      </dd>
      <dt className="text-small text-muted-foreground">
        {href ? (
          <Link
            href={href}
            className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {label}
          </Link>
        ) : (
          label
        )}
      </dt>
    </div>
  );
}

// The same rows as ProfileCard: a 64px avatar with 16px below it, a 34px name, a 20px joined line, a two-line
// 48px bio, a 24px tag line, and a 44px stats row under a hairline, and for
// the signed-in user's own profile a 28px actions row. A profile with no bio
// is 64px shorter than this, which no skeleton can know in advance.
export function ProfileCardSkeleton({
  withActions = false,
}: {
  withActions?: boolean;
}) {
  return (
    <Surface aria-hidden>
      <Skeleton className="mb-4 size-16 rounded-full" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <Skeleton className="h-8.5 w-40" />
          <Skeleton className="mt-1 h-5 w-32" />
        </div>
        <Skeleton className="h-7 w-12" />
      </div>
      <div className="mt-4 flex h-12 flex-col justify-center gap-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mt-4 flex h-6 items-center gap-1.5">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      {withActions && <Skeleton className="mt-5 h-7 w-2/3" />}
    </Surface>
  );
}
