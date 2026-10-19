import { cn } from "@/lib/utils";

// Other users are shown by their first letter on a tinted surface, since the
// API does not expose their pictures (D-40). The sizes are fixed, so an avatar
// never changes the height of the row it sits in.
const SIZES = {
  20: "size-5 text-[10px]",
  32: "size-8 text-small",
  64: "size-16 text-heading",
} as const;

export function MonogramAvatar({
  username,
  size = 20,
  className,
}: {
  username: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full border bg-muted font-mono font-medium uppercase text-muted-foreground",
        SIZES[size],
        className,
      )}
    >
      {username.charAt(0)}
    </span>
  );
}
