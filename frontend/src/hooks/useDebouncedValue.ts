// frontend/src/hooks/useDebouncedValue.ts
"use client";

import { useEffect, useState } from "react";

// Returns value only after it has stopped changing for delayMs. The search box
// uses it so typing "pipeline" makes one request, not eight.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
