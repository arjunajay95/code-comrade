"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ApiError } from "@/services/apiClient";

export function Providers({ children }: { children: ReactNode }) {
  // Created once per browser session. Holding it in state stops React from
  // building a new cache on every render, which would throw the data away.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data counts as fresh for 30 seconds, so going back to the feed
            // does not refetch it immediately.
            staleTime: 30_000,
            // Retrying helps with network failures and server errors. A 4xx
            // means the request itself was wrong, and asking again gets the
            // same answer, so it is never retried.
            retry: (failureCount, error) => {
              if (
                error instanceof ApiError &&
                error.status >= 400 &&
                error.status < 500
              ) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <ThemeProvider
      // globals.css defines dark mode under a .dark class, so the theme is
      // applied as a class on <html>.
      attribute="class"
      // Dark on a first visit for everyone, whatever their operating system
      // prefers. The toggle then remembers their choice in local storage.
      defaultTheme="dark"
      enableSystem={false}
      // Stops every color from animating at once when the theme flips.
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
