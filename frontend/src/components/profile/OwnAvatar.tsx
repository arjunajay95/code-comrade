"use client";

import { useUser } from "@clerk/nextjs";
import { MonogramAvatar } from "./MonogramAvatar";

// The signed-in user's own picture from Clerk, at 64px, with the monogram when
// they have none. Other users never get this, since the API does not expose
// their pictures (D-40). The size is fixed, so it moves nothing as it loads.
export function OwnAvatar({ username }: { username: string }) {
  const { user } = useUser();

  if (!user?.hasImage) return <MonogramAvatar username={username} size={64} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small avatar from Clerk's CDN, at a fixed size
    <img
      src={user.imageUrl}
      alt=""
      width={64}
      height={64}
      className="size-16 rounded-full border object-cover"
    />
  );
}
