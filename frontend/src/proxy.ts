import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
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
const handleSession = clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname !== "/") return;
  const { userId } = await auth();
  if (userId) return NextResponse.redirect(new URL("/feed", request.url));
});

// Clerk's cookies and query parameters all start with one of these. A request
// with none of them has no session, and is not coming back from a Clerk
// redirect that needs finishing.
const CLERK_COOKIE = /^__(client_uat|session|clerk_db_jwt)/;

function mayHaveSession(request: NextRequest) {
  const hasCookie = request.cookies
    .getAll()
    .some((cookie) => CLERK_COOKIE.test(cookie.name));
  const hasParam = [...request.nextUrl.searchParams.keys()].some((key) =>
    key.startsWith("__clerk"),
  );
  return hasCookie || hasParam;
}

// A first-time visitor to / has nothing for the middleware to decide, so it
// is not run for them. On Clerk's development instance, running it sends a
// browser with no dev-browser cookie through a handshake redirect to Clerk and
// back before the page is served, which is about two seconds of the landing
// page's load on Slow 4G. Every other path still goes through Clerk.
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname === "/" && !mayHaveSession(request)) {
    return NextResponse.next();
  }
  return handleSession(request, event);
}

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
