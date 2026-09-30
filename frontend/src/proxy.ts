import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Pages that need a signed-in user. This is a
// courtesy, so a signed-out visitor lands on sign-in instead of an empty page.
// It is not security: the API checks every request again on its own.
// Each family is listed as the bare path plus its children, so "/me" is
// protected but "/members" is not.
const isProtectedRoute = createRouteMatcher([
  "/submissions/new",
  "/me",
  "/me/(.*)",
  "/settings",
  "/settings/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
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
