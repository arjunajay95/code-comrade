"use client";

import { useMe } from "@/hooks/useMe";

// Karma shown the way a diff shows added lines: a green +N. The badge keeps
// the same size while loading, so the header never shifts when it arrives.
export function KarmaBadge() {
  const { data, isError } = useMe();

  // The header stays usable without it. A failure here is not worth an error
  // message in the navigation bar.
  if (isError) return null;

  return (
    <span
      title="Karma, earned by reviewing other people's code"
      aria-label={data ? `${data.karma} karma` : "Loading karma"}
      className="inline-flex h-7 min-w-20 items-center justify-center gap-1.5 rounded-md border px-2 text-xs tabular-nums"
    >
      {data ? (
        <>
          <span className="text-addition">+{data.karma}</span>
          <span className="text-muted-foreground">karma</span>
        </>
      ) : (
        <span
          className="h-3 w-12 animate-pulse rounded-sm bg-muted"
          aria-hidden
        />
      )}
    </span>
  );
}
