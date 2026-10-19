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

// The public origin of the deployed site. Root metadata resolves relative
// image and link URLs against it (D-40).
export const SITE_URL = "https://codecomrade.vercel.app";

export const SITE_DESCRIPTION =
  "Post your code for review, review other developers' code, and earn karma for every review you write.";

// The credit for the landing page hero photo, which the license asks us to show.
export const HERO_CREDIT = {
  name: "Daniel Leone",
  url: "https://unsplash.com/photos/annapurna-peaks-under-stars-in-nepal-v7daTKlZzaw?utm_source=unsplash&utm_medium=referral&utm_content=creditShareLink",
} as const;
