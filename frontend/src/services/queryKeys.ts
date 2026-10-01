// Every TanStack Query key in one place. Pages never write a key by hand, so
// invalidation can target a whole family, for example every feed page after
// a new submission.

export const queryKeys = {
  // Anything tied to a signed-in user includes their Clerk user id. When one
  // person signs out and another signs in on the same browser, the second
  // person can never be shown the first person's cached data.
  me: (userId: string) => ["me", userId] as const,

  feed: {
    all: ["feed"] as const,
    public: (params: object) => ["feed", "public", params] as const,
    // The prefix shared by every personalized page, for invalidating them all
    // at once when the stack changes.
    personalizedAll: ["feed", "personalized"] as const,
    personalized: (userId: string, params: object) =>
      ["feed", "personalized", userId, params] as const,
  },

  submissions: {
    detail: (id: number) => ["submissions", id] as const,
  },

  technologies: {
    all: ["technologies"] as const,
    list: (params: object) => ["technologies", params] as const,
  },
};
