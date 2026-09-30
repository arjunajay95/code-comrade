"use client";

import { KarmaChip } from "@/components/karma/KarmaChip";
import { useMe } from "@/hooks/useMe";

export function KarmaBadge() {
  const { data, isError } = useMe();

  // The header stays usable without it. A failure here is not worth an error
  // message in the navigation bar.
  if (isError) return null;

  return <KarmaChip value={data?.karma ?? null} />;
}
