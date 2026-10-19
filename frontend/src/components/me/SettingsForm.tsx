"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layers } from "lucide-react";
import { z } from "zod";
import { TechnologyTag } from "@/components/feed/TechnologyTag";
import { Field, FormError } from "@/components/form/Field";
import { ErrorCard } from "@/components/shell/StateCard";
import { Surface } from "@/components/shell/Surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/useMe";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { ApiError } from "@/services/apiClient";
import type { Me } from "@/services/users";
import { useUiStore } from "@/stores/uiStore";

// The username format the API and the database enforce. Reserved names are
// policy and only the API checks them.
const schema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,30}$/,
      "Use 3 to 30 characters: lowercase letters, digits and underscores",
    ),
  bio: z.string().trim().max(500, "Use at most 500 characters"),
});

type FormValues = z.input<typeof schema>;

export function SettingsForm() {
  const me = useMe();

  // A 36px username input and an 80px bio, as in the loaded form.
  if (me.isPending) {
    return (
      <Surface className="space-y-6" aria-hidden>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
      </Surface>
    );
  }

  if (me.isError) {
    return (
      <ErrorCard
        title="Could not load your settings"
        error={me.error}
        onRetry={() => void me.refetch()}
      />
    );
  }

  return <LoadedSettings me={me.data} />;
}

function LoadedSettings({ me }: { me: Me }) {
  const mutation = useUpdateProfile();
  const openStackPicker = useUiStore((state) => state.openStackPicker);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: me.username, bio: me.bio ?? "" },
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = form;

  const onSubmit = handleSubmit((values) => {
    if (mutation.isPending) return;

    // Only what changed is sent. An empty bio clears it.
    const bio = values.bio === "" ? null : values.bio;
    const body: { username?: string; bio?: string | null } = {};
    if (values.username !== me.username) body.username = values.username;
    if (bio !== me.bio) body.bio = bio;
    if (Object.keys(body).length === 0) return;

    mutation.mutate(body, {
      onSuccess: (saved) =>
        reset({ username: saved.username, bio: saved.bio ?? "" }),
      onError: (error) => {
        // 409 is the database unique constraint speaking: someone has it.
        if (error instanceof ApiError && error.status === 409) {
          setError("username", { message: error.message });
        }
      },
    });
  });

  const usernameTaken =
    mutation.error instanceof ApiError && mutation.error.status === 409;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} noValidate>
        <Surface className="space-y-6">
          <Field
            label="Username"
            htmlFor="username"
            hint="Public, and part of your profile address."
            error={errors.username?.message}
          >
            <Input
              id="username"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errors.username ? true : undefined}
              {...register("username")}
            />
          </Field>

          <Field
            label="Bio"
            htmlFor="bio"
            hint="Optional. Shown on your public profile."
            error={errors.bio?.message}
          >
            <Textarea
              id="bio"
              rows={4}
              aria-invalid={errors.bio ? true : undefined}
              {...register("bio")}
            />
          </Field>

          {!usernameTaken && <FormError error={mutation.error} />}

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            {mutation.isSuccess && !isDirty && (
              <span
                role="status"
                className="text-center text-small text-muted-foreground"
              >
                Saved
              </span>
            )}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={!isDirty || mutation.isPending}
            >
              {mutation.isPending ? "Saving" : "Save changes"}
            </Button>
          </div>
        </Surface>
      </form>

      <Surface>
        <h2 className="text-heading font-medium">Technology stack</h2>
        <p className="mt-1 text-small text-muted-foreground">
          The For you feed ranks submissions by how well they match it.
        </p>
        <ul className="mt-4 flex min-h-6 flex-wrap gap-1.5">
          {me.technologies.length === 0 ? (
            <li className="text-small text-muted-foreground">
              No technologies yet.
            </li>
          ) : (
            me.technologies.map((technology) => (
              <li key={technology.id}>
                <TechnologyTag name={technology.name} />
              </li>
            ))
          )}
        </ul>
        <Button variant="outline" className="mt-4" onClick={openStackPicker}>
          <Layers aria-hidden />
          Edit stack
        </Button>
      </Surface>
    </div>
  );
}
