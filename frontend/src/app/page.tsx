// Temporary: proves the API client works. Replaced by the feed.
"use client";

import { useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { ApiError, publicRequest } from "@/services/apiClient";

export default function Home() {
  const me = useMe();
  const [unauthedResult, setUnauthedResult] = useState<string | null>(null);

  // Calls a protected route through publicRequest, which never sends a token.
  // Proves the API rejects it: the done-when "authenticated call without the
  // bearer helper fails".
  const callWithoutToken = async () => {
    try {
      await publicRequest("/users/me");
      setUnauthedResult("Unexpected: succeeded without a token");
    } catch (err) {
      setUnauthedResult(
        err instanceof ApiError ? `${err.status} ${err.code}` : String(err),
      );
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-xl">CodeComrade</h1>

      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button>Sign in</Button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <UserButton />
        {me.isPending && <p>Loading profile</p>}
        {me.data && (
          <p>
            {me.data.username} · karma {me.data.karma}
          </p>
        )}
        {me.error && <p>Error: {me.error.message}</p>}
        <Button variant="outline" onClick={callWithoutToken}>
          Call /users/me without the token
        </Button>
        {unauthedResult && <p>{unauthedResult}</p>}
      </Show>
    </main>
  );
}
