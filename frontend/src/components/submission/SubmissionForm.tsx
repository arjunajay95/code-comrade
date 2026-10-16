"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Plus, X } from "lucide-react";
import { z } from "zod";
import { Field, FormError } from "@/components/form/Field";
import { TechnologySelect } from "@/components/stack/TechnologySelect";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSubmission } from "@/hooks/useCreateSubmission";
import { useUpdateSubmission } from "@/hooks/useUpdateSubmission";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/apiClient";

// The limits the API enforces (BLUEPRINT §4). The backend schema is the
// authority; these only save a round trip, and the API checks again.
const MAX_CRITERIA = 5;
const MAX_TECHNOLOGIES = 8;

// The page URL is what people paste, but a clone URL or a trailing slash is
// an easy slip. The server stays strict (BLUEPRINT §4a), so the form tidies
// those two before sending.
const cleanGithubUrl = (value: string) =>
  value.replace(/\/+$/, "").replace(/\.git$/i, "");

const GITHUB_URL = /^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

const baseShape = {
  title: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(100, "Use at most 100 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Use at least 10 characters")
    .max(2000, "Use at most 2000 characters"),
  githubUrl: z
    .string()
    .trim()
    .max(200, "Use at most 200 characters")
    .transform(cleanGithubUrl)
    .pipe(
      z
        .string()
        .regex(GITHUB_URL, "Use the form https://github.com/owner/repo"),
    ),
  technologies: z
    .array(z.string())
    .min(1, "Pick at least one technology")
    .max(MAX_TECHNOLOGIES),
};

const createSchema = z
  .object({
    ...baseShape,
    criteria: z
      .array(
        z.object({
          label: z
            .string()
            .trim()
            .min(2, "Use at least 2 characters")
            .max(60, "Use at most 60 characters"),
        }),
      )
      .min(1)
      .max(MAX_CRITERIA),
  })
  .superRefine((value, context) => {
    // The database has no unique constraint on labels, so this and the API's
    // own check are the only guards. Compared the way the API does.
    const seen = new Set<string>();
    value.criteria.forEach((criterion, index) => {
      const key = criterion.label.toLowerCase();
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each criterion needs a different label",
          path: ["criteria", index, "label"],
        });
      }
      seen.add(key);
    });
  });

// Criteria are locked once a submission exists, so editing never validates
// them. They are carried in the values only so one form type serves both.
const editSchema = z.object({
  ...baseShape,
  criteria: z.array(z.object({ label: z.string() })),
});

type FormValues = z.input<typeof createSchema>;

interface SubmissionFormProps {
  mode: "create" | "edit";
  // Edit mode only.
  submissionId?: number;
  initial?: FormValues;
}

const EMPTY: FormValues = {
  title: "",
  description: "",
  githubUrl: "",
  technologies: [],
  criteria: [{ label: "" }],
};

export function SubmissionForm({
  mode,
  submissionId,
  initial = EMPTY,
}: SubmissionFormProps) {
  const router = useRouter();
  const creating = mode === "create";
  const create = useCreateSubmission();
  const update = useUpdateSubmission(submissionId ?? 0);
  const mutation = creating ? create : update;

  const form = useForm<FormValues>({
    resolver: zodResolver(creating ? createSchema : editSchema),
    defaultValues: initial,
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;
  const criteria = useFieldArray({ control, name: "criteria" });

  const onSubmit = handleSubmit((values) => {
    // A second click while the first request is in flight is ignored, in
    // addition to the disabled button. The idempotency key covers a retry
    // after a network failure, not a double click.
    if (mutation.isPending || mutation.isSuccess) return;

    const { criteria: rows, ...fields } = values;
    const onSuccess = (submission: { id: number }) =>
      router.push(`/submissions/${submission.id}`);
    const onError = (error: Error) => {
      // The strict parser's verdict belongs next to the field it judged.
      if (error instanceof ApiError && error.code === "INVALID_REPO_URL") {
        setError("githubUrl", { message: error.message });
      }
    };

    if (creating) {
      create.mutate({ ...fields, criteria: rows }, { onSuccess, onError });
    } else {
      update.mutate(fields, { onSuccess, onError });
    }
  });

  const cancelHref = creating ? "/" : `/submissions/${submissionId}`;
  // INVALID_REPO_URL is already shown on its field.
  const formError =
    mutation.error instanceof ApiError &&
    mutation.error.code === "INVALID_REPO_URL"
      ? null
      : mutation.error;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <Card className="gap-0 py-0">
        <CardContent className="space-y-4 p-4">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input
              id="title"
              autoComplete="off"
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <Field
            label="What do you want reviewed?"
            htmlFor="description"
            hint="Say what the code does and where you want a second pair of eyes."
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={5}
              aria-invalid={errors.description ? true : undefined}
              {...register("description")}
            />
          </Field>

          <Field
            label="GitHub repository"
            htmlFor="githubUrl"
            hint="A public repository, for example https://github.com/owner/repo."
            error={errors.githubUrl?.message}
          >
            <Input
              id="githubUrl"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errors.githubUrl ? true : undefined}
              {...register("githubUrl")}
            />
          </Field>

          <Field
            label="Technologies"
            htmlFor="technology-search"
            error={errors.technologies?.message}
          >
            <Controller
              control={control}
              name="technologies"
              render={({ field }) => (
                <TechnologySelect
                  inputId="technology-search"
                  value={field.value}
                  onChange={field.onChange}
                  max={MAX_TECHNOLOGIES}
                  label="Used in this code"
                />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="p-4">
          <h2 className="text-sm font-medium">Criteria</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            What reviewers rate from 1 to 5. Between 1 and {MAX_CRITERIA}.
          </p>

          {creating ? (
            <>
              <ul className="mt-3 space-y-2">
                {criteria.fields.map((row, index) => (
                  <li key={row.id}>
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`Criterion ${index + 1}`}
                        placeholder="For example: readability"
                        autoComplete="off"
                        aria-invalid={
                          errors.criteria?.[index]?.label ? true : undefined
                        }
                        {...register(`criteria.${index}.label` as const)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove criterion ${index + 1}`}
                        disabled={criteria.fields.length <= 1}
                        onClick={() => criteria.remove(index)}
                      >
                        <X />
                      </Button>
                    </div>
                    {errors.criteria?.[index]?.label && (
                      <p role="alert" className="mt-1 text-xs text-destructive">
                        {errors.criteria[index].label.message}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                disabled={criteria.fields.length >= MAX_CRITERIA}
                onClick={() => criteria.append({ label: "" })}
              >
                <Plus />
                Add a criterion
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Criteria cannot be changed once you post, because reviews rate
                them.
              </p>
            </>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {initial.criteria.map((criterion, index) => (
                  <li
                    key={index}
                    className="rounded-lg bg-muted/50 px-3 py-2 text-xs [overflow-wrap:anywhere]"
                  >
                    {criterion.label}
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3" aria-hidden />
                Locked. Reviews rate these criteria, so they cannot change.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <FormError error={formError} />

      <div className="flex items-center justify-end gap-2">
        <Link
          href={cancelHref}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancel
        </Link>
        <Button
          type="submit"
          disabled={mutation.isPending || mutation.isSuccess}
        >
          {mutation.isPending
            ? creating
              ? "Posting"
              : "Saving"
            : creating
              ? "Post for review"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
