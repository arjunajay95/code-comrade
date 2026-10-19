"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { switchTheme } from "@/lib/themeTransition";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={(event) =>
        switchTheme(
          setTheme,
          resolvedTheme === "dark" ? "light" : "dark",
          event.currentTarget,
        )
      }
    >
      {/* Both icons render, and CSS picks one from the .dark class that
          next-themes sets before the page paints. Choosing in JavaScript
          instead would show the wrong icon until the page loaded. */}
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </Button>
  );
}
