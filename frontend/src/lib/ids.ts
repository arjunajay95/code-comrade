// PostgreSQL's integer maximum. The API rejects anything above it, so the
// pages do too, instead of sending a request that can only fail.
const MAX_ID = 2_147_483_647;

// Digits only, so "1e3" and "0x10" are rejected instead of being read as
// numbers by Number(). Returns null for an id that can never exist.
export function parseSubmissionId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 && id <= MAX_ID ? id : null;
}
