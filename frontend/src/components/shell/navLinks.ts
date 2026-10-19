// The main navigation, shared by the header and the mobile menu. The
// submission pages are reached from the feed, so they count as being in it.
export const NAV_LINKS = [
  {
    href: "/feed",
    label: "Feed",
    isCurrent: (pathname: string) =>
      pathname === "/feed" || pathname.startsWith("/submissions"),
  },
  {
    href: "/changelog",
    label: "What's new",
    isCurrent: (pathname: string) => pathname === "/changelog",
  },
] as const;
