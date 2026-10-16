"use client";

import { useCallback, useRef } from "react";

// One Idempotency-Key per submit attempt (D-29, BLUEPRINT §9). A key is reused
// only to retry the same request after a failure, and a new one is made
// whenever the payload changes, because a key whose first attempt got a
// stored 4xx cannot be reused with a corrected body (422).
export function useIdempotencyKey() {
  const current = useRef<{ payload: string; key: string } | null>(null);

  const keyFor = useCallback((payload: unknown): string => {
    const serialized = JSON.stringify(payload);
    if (current.current?.payload !== serialized) {
      // A UUID is 36 characters from the allowed set (1 to 128 of A-Z, a-z,
      // 0-9, hyphen, underscore).
      current.current = { payload: serialized, key: crypto.randomUUID() };
    }
    return current.current.key;
  }, []);

  // Called after a success, so a later submission never reuses the key.
  const reset = useCallback(() => {
    current.current = null;
  }, []);

  return { keyFor, reset };
}
