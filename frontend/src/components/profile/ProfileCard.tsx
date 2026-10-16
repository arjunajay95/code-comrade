import type { ReactNode } from "react";
import { TechnologyTag } from "@/components/feed/TechnologyTag";
import { KarmaChip } from "@/components/karma/KarmaChip";
import { Card, CardContent } from "@/components/ui/card";
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
}: {
  profile: ProfileData;
  actions?: ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-medium [overflow-wrap:anywhere]">
              {profile.username}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Joined {joined.format(new Date(profile.createdAt))}
            </p>
          </div>
          <KarmaChip value={profile.karma} />
        </div>

        {profile.bio && (
          <p
            className={cn(
              "mt-3 whitespace-pre-line text-sm/6 text-muted-foreground",
              "[overflow-wrap:anywhere]",
            )}
          >
            {profile.bio}
          </p>
        )}

        <ul
          aria-label="Technologies"
          className="mt-3 flex min-h-6 flex-wrap gap-1.5"
        >
          {profile.technologies.length === 0 ? (
            <li className="text-xs text-muted-foreground">
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

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Requests" value={profile.stats.submissions} />
          <Stat label="Reviews given" value={profile.stats.reviewsGiven} />
          <Stat
            label="Reviews received"
            value={profile.stats.reviewsReceived}
          />
        </dl>

        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2">
      <dd className="text-base font-medium tabular-nums">{value}</dd>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
    </div>
  );
}
