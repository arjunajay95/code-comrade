// Temporary: proves the providers work. Replaced by the feed.

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
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
      </Show>
    </main>
  );
}
