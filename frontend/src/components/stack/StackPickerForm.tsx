"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateStack } from "@/hooks/useUpdateStack";
import { ApiError } from "@/services/apiClient";
import { TechnologySelect } from "./TechnologySelect";

// The limit PATCH /users/me enforces.
const MAX_TECHNOLOGIES = 20;

interface StackPickerFormProps {
  // The saved stack, as names.
  initial: string[];
  onDone: () => void;
}

export function StackPickerForm({ initial, onDone }: StackPickerFormProps) {
  const [selected, setSelected] = useState<string[]>(initial);
  const mutation = useUpdateStack();

  // Order does not matter, only which names are in the stack.
  const changed =
    selected.length !== initial.length ||
    selected.some((name) => !initial.includes(name));

  const save = () => mutation.mutate(selected, { onSuccess: onDone });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Your technology stack</DialogTitle>
        <DialogDescription>
          Pick the technologies you work with. The &quot;For you&quot; feed
          ranks posts by how well they match your stack.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <TechnologySelect
          value={selected}
          onChange={setSelected}
          max={MAX_TECHNOLOGIES}
          label="Your stack"
        />

        {mutation.error && (
          <p role="alert" className="text-small text-destructive">
            {mutation.error.message}
            {mutation.error instanceof ApiError && mutation.error.requestId && (
              <>
                {" (reference "}
                <span className="font-mono">{mutation.error.requestId}</span>
                {")"}
              </>
            )}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {initial.length === 0 ? "Not now" : "Cancel"}
        </Button>
        <Button onClick={save} disabled={!changed || mutation.isPending}>
          {mutation.isPending ? "Saving" : "Save stack"}
        </Button>
      </DialogFooter>
    </>
  );
}
