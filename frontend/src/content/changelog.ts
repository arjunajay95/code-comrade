export interface ChangelogImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface ChangelogEntry {
  // The day the release went live, as YYYY-MM-DD.
  date: string;
  title: string;
  // One or two sentences.
  summary: string;
  changes: string[];
  image?: ChangelogImage;
}

// Newest first, one entry per release a visitor could notice. The page reads
// this array in order, so a new release goes at the top.
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-19",
    title: "A new look, a landing page and this changelog",
    summary:
      "The whole app has a new design that is easier to read, and visitors who are not signed in now land on a page that explains how CodeComrade works.",
    changes: [
      "A new look across every page, with larger text and calmer cards",
      "A landing page with a short walkthrough and a preview of the feed",
      "The feed now lives at /feed, with the filters beside the list on wide screens",
      "Smoother movement in the feed tabs and filters, and a karma number that slides when it changes",
      "This changelog, where every release is listed",
      "Code snippets in posts and reviews, highlighted, with a copy button",
    ],
  },
  {
    date: "2026-10-16",
    title: "Create posts, write reviews and earn karma",
    summary:
      "You can now post your own code for review and review other developers' code. Every review you write earns you karma.",
    changes: [
      "Create a post with a GitHub link, a description and the criteria reviewers rate",
      "Edit a post after publishing it, except for its criteria",
      "Rate each criterion from 1 to 5 and write feedback for the author",
      "Karma appears next to your name, and each review adds to it",
      "Each post can be reviewed once per person, and never by its author",
      "Public profiles, plus your own posts and the reviews you wrote and received",
      "A settings page for your username and bio",
    ],
  },
  {
    date: "2026-10-01",
    title: "The first public release",
    summary:
      "CodeComrade opens with a feed of posts for review, a For you tab that ranks them by your stack, and a page for every post.",
    changes: [
      "A public feed with search and technology filters",
      "A For you tab that ranks posts by how well they match your technologies",
      "Sign in and sign up",
      "A page for each post, with its ratings and reviews",
      "Choose your technology stack when you first sign in, and change it any time",
      "Dark and light themes",
    ],
  },
  {
    date: "2026-09-29",
    title: "The public API and example posts",
    summary:
      "The service behind CodeComrade went live, with a public feed and post details that anyone can read, and example posts to browse.",
    changes: [
      "Read the feed, with search and technology filters, without an account",
      "Post details, public profiles and the list of technologies are open to read",
      "Fifteen example posts, so the feed has something in it from the start",
    ],
  },
];
