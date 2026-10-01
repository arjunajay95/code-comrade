const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

// numeric: "auto" turns 1 day into "yesterday" and 1 month into "last month".
const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "2 hours ago", "yesterday", "last month". now is a parameter so the result
// can be tested against a fixed moment.
export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}
