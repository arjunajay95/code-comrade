"use client";

import { create } from "zustand";

// Client-side selections only (D-22). The feed data itself lives in the
// TanStack Query cache and is never copied here.
interface FeedState {
  page: number;
  setPage: (page: number) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  page: 1,
  setPage: (page) => set({ page }),
}));
