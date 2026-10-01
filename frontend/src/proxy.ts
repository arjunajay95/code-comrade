import { clerkMiddleware } from "@clerk/nextjs/server";

// Makes the session available to every page, layout and server function.
// It protects nothing by itself: each protected page checks the session with
// auth.protect(), so the check lives with the page it guards and cannot drift
// from the route list the way a path matcher could. The API still enforces
// every rule on its own, whatever the frontend does.
export default clerkMiddleware();

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
