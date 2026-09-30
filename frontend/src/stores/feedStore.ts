// frontend/src/stores/feedStore.ts
"use client";

import { create } from "zustand";

export type FeedView = "latest" | "for-you";

// The API rejects more than 10 technologies in one filter.
export const MAX_TECHNOLOGY_FILTERS = 10;

// Client-side selections only (D-22). The feed data itself lives in the
// TanStack Query cache and is never copied here.
interface FeedState {
  // null until the visitor picks a tab. Until then, signed-in users see "For
  // you" and everyone else sees "Latest".
  view: FeedView | null;
  page: number;
  search: string;
  technologies: string[];
  // Bumped by clearFilters. The filter controls use it as a React key, so
  // they remount with empty inputs instead of keeping stale typed text.
  resetCount: number;
  setView: (view: FeedView) => void;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  toggleTechnology: (name: string) => void;
  clearFilters: () => void;
}

// Any change to what the list shows sends it back to page 1. Otherwise a
// narrower filter could leave you on a page that no longer exists.
export const useFeedStore = create<FeedState>((set) => ({
  view: null,
  page: 1,
  search: "",
  technologies: [],
  resetCount: 0,

  setView: (view) => set({ view, page: 1 }),
  setPage: (page) => set({ page }),

  // A no-op when the value is unchanged. The search box reports its value when
  // it mounts, and resetting the page then would send you back to page 1 every
  // time you returned to the feed from a detail page.
  setSearch: (search) =>
    set((state) => (state.search === search ? state : { search, page: 1 })),

  toggleTechnology: (name) =>
    set((state) => {
      const selected = state.technologies.includes(name);
      if (!selected && state.technologies.length >= MAX_TECHNOLOGY_FILTERS)
        return state;
      return {
        technologies: selected
          ? state.technologies.filter((existing) => existing !== name)
          : [...state.technologies, name],
        page: 1,
      };
    }),

  clearFilters: () =>
    set((state) => ({
      search: "",
      technologies: [],
      page: 1,
      resetCount: state.resetCount + 1,
    })),
}));
