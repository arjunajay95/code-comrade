"use client";

import { UserButton } from "@clerk/nextjs";
import { Layers, User } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";

// Clerk's avatar menu with two extra items. The other two are listed so the
// order is: edit stack, your profile, manage account, sign out.
export function UserMenu() {
  const openStackPicker = useUiStore((state) => state.openStackPicker);

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          label="Edit your stack"
          labelIcon={<Layers className="size-4" />}
          onClick={openStackPicker}
        />
        <UserButton.Link
          label="Your profile"
          labelIcon={<User className="size-4" />}
          href="/me"
        />
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
