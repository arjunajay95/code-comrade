import type { Metadata } from "next";
import Image from "next/image";
import {
  ChangelogNav,
  type NavYear,
} from "@/components/changelog/ChangelogNav";
import { SectionTitle } from "@/components/landing/SectionTitle";
import { Container } from "@/components/shell/Container";
import { CHANGELOG } from "@/content/changelog";

export const metadata: Metadata = { title: "What's new" };

// Entry dates are plain days, so they are formatted in UTC. Local time would
// show the day before for anyone west of Greenwich.
const longDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const monthName = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

const format = (date: string, formatter: Intl.DateTimeFormat) =>
  formatter.format(new Date(`${date}T00:00:00Z`));

// Entries are newest first, so the first one seen for a month is that month's
// first entry on the page, and the order of years and months follows it.
function groupByMonth(): NavYear[] {
  const years: NavYear[] = [];
  const seen = new Set<string>();
  for (const entry of CHANGELOG) {
    const key = entry.date.slice(0, 7);
    if (seen.has(key)) continue;
    seen.add(key);
    const year = entry.date.slice(0, 4);
    let group = years.find((candidate) => candidate.year === year);
    if (!group) {
      group = { year, months: [] };
      years.push(group);
    }
    group.months.push({
      key,
      label: format(entry.date, monthName),
      entryId: entry.date,
    });
  }
  return years;
}

export default function ChangelogPage() {
  const newest = CHANGELOG[0];

  return (
    <Container size="wide">
      <header className="mb-16">
        <p className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
          Changelog, updated {format(newest.date, longDate)}
        </p>
        <h1 className="mt-4 font-display text-display">What&apos;s new</h1>
        <p className="mt-4 text-body text-muted-foreground">
          Everything that has shipped, newest first.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ChangelogNav years={groupByMonth()} />
          </div>
        </aside>

        <div className="max-w-3xl">
          {CHANGELOG.map((entry) => (
            <article
              key={entry.date}
              id={entry.date}
              data-changelog-entry
              data-month={entry.date.slice(0, 7)}
              className="scroll-mt-24 border-t py-12 first:border-t-0 first:pt-0"
            >
              <time
                dateTime={entry.date}
                className="font-mono text-small text-muted-foreground"
              >
                {format(entry.date, longDate)}
              </time>
              <SectionTitle className="mt-3">{entry.title}</SectionTitle>
              <p className="mt-3 text-heading text-muted-foreground">
                {entry.summary}
              </p>
              <ul className="mt-6 space-y-2 text-body">
                {entry.changes.map((change) => (
                  <li key={change} className="flex gap-3">
                    <span
                      aria-hidden
                      className="font-mono text-muted-foreground"
                    >
                      +
                    </span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
              {entry.image && (
                <Image
                  src={entry.image.src}
                  width={entry.image.width}
                  height={entry.image.height}
                  alt={entry.image.alt}
                  className="mt-8 h-auto w-full rounded-xl border"
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </Container>
  );
}
