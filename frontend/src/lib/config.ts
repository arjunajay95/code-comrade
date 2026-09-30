// Next.js inlines NEXT_PUBLIC_ variables into the browser bundle at build
// time. The name must be written out in full here, since Next.js finds these
// by reading the code, not by looking them up at runtime.
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Add it to frontend/.env.local.",
  );
}

// Without a trailing slash, so paths like "/feed" join cleanly.
export const API_URL = apiUrl.replace(/\/+$/, "");
