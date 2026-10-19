import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// Makes the session available to every page, layout and server function.
// It protects nothing by itself: each protected page checks the session with
// auth.protect(), so the check lives with the page it guards and cannot drift
// from the route list the way a path matcher could. The API still enforces
// every rule on its own, whatever the frontend does.
//
// The one thing it does decide is where a signed-in visitor to / goes. Doing
// it here, before any page renders, lets the landing page itself be static: it
// never reads the session, and a signed-in user never receives it.
export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname !== "/") return;
  const { userId } = await auth();
  if (userId) return NextResponse.redirect(new URL("/feed", request.url));
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
    // Always run for Clerk's own frontend routes.
    "/__clerk/(.*)",
  ],
};
