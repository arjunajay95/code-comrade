"use client";

import { create } from "zustand";

// UI flags only (D-22). One shared flag lets the auto-open on first sign-in,
// the feed's button and the avatar menu all open the same dialog.
interface UiState {
  stackPickerOpen: boolean;
  openStackPicker: () => void;
  closeStackPicker: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  stackPickerOpen: false,
  openStackPicker: () => set({ stackPickerOpen: true }),
  closeStackPicker: () => set({ stackPickerOpen: false }),
}));
