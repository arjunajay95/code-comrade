"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMe } from "@/hooks/useMe";
import { useUiStore } from "@/stores/uiStore";
import { StackPickerForm } from "./StackPickerForm";

// Remembers, per person and per browser, that the picker was already offered.
const offeredKey = (userId: string) => `codecomrade:stack-offered:${userId}`;

export function StackPickerHost() {
  const { isSignedIn, userId } = useAuth();
  const me = useMe();
  const open = useUiStore((state) => state.stackPickerOpen);
  const openStackPicker = useUiStore((state) => state.openStackPicker);
  const closeStackPicker = useUiStore((state) => state.closeStackPicker);

  const hasNoStack = me.data?.technologies.length === 0;

  // The first-sign-in offer. It runs once the profile has loaded and shows an
  // empty stack, and the flag is written before opening, so closing the
  // dialog any way counts as an answer and it does not return.
  useEffect(() => {
    if (!userId || !hasNoStack) return;
    try {
      if (window.localStorage.getItem(offeredKey(userId))) return;
      window.localStorage.setItem(offeredKey(userId), "1");
    } catch {
      // Storage can be unavailable, for example in a private window. Without
      // a way to remember the answer, the offer is skipped instead of
      // repeating on every page load. The buttons still open the picker.
      return;
    }
    openStackPicker();
  }, [userId, hasNoStack, openStackPicker]);

  // Signing out closes the dialog, so the next person never inherits it.
  useEffect(() => {
    if (isSignedIn === false) closeStackPicker();
  }, [isSignedIn, closeStackPicker]);

  if (!me.data) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? openStackPicker() : closeStackPicker())}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <StackPickerForm
          initial={me.data.technologies.map((technology) => technology.name)}
          onDone={closeStackPicker}
        />
      </DialogContent>
    </Dialog>
  );
}
