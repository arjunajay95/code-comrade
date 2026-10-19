"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./navLinks";

const MENU_ID = "mobile-menu";

// The navigation below sm, where the header has no room for it. A modal dialog
// from Base UI gives the focus trap, Escape, outside click and the return of
// focus to the button. It is anchored under the 56px header, full width.
export function MobileMenu() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);

  // A route change closes the menu. Adjusting state while rendering is the
  // supported way to react to a changed value without an effect.
  const [openPath, setOpenPath] = useState(pathname);
  if (pathname !== openPath) {
    setOpenPath(pathname);
    setOpen(false);
  }

  // The menu is hidden from sm up. Without this, widening the window with it
  // open would leave the page behind it inert.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 40rem)");
    const close = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, []);

  const row =
    "flex min-h-12 w-full items-center rounded-md px-3 text-body outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls={MENU_ID}
          />
        }
      >
        <Menu aria-hidden />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-x-0 top-14 bottom-0 z-50 bg-black/40 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none sm:hidden" />
        <DialogPrimitive.Popup
          id={MENU_ID}
          className="fixed inset-x-0 top-14 z-50 border-b bg-card p-2 outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-2 motion-reduce:animate-none sm:hidden"
        >
          <DialogPrimitive.Title className="sr-only">
            Menu
          </DialogPrimitive.Title>
          <nav aria-label="Menu">
            <ul>
              {NAV_LINKS.map((link) => {
                const current = link.isCurrent(pathname);
                return (
                  <li key={link.href}>
                    <DialogPrimitive.Close
                      render={
                        <Link
                          href={link.href}
                          aria-current={current ? "page" : undefined}
                        />
                      }
                      className={cn(
                        row,
                        current
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {link.label}
                    </DialogPrimitive.Close>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-1 border-t pt-1">
            <button
              type="button"
              aria-label="Toggle color theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className={cn(row, "justify-between")}
            >
              <span>Theme</span>
              {/* Both icons render, and CSS picks one from the .dark class,
                  so the right one shows before the page has hydrated. */}
              <Sun className="hidden size-4 dark:block" aria-hidden />
              <Moon className="size-4 dark:hidden" aria-hidden />
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
