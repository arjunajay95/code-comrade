"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, FormError } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/shell/Surface";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReview } from "@/hooks/useCreateReview";
import { RatingInput } from "./RatingInput";

interface Criterion {
  id: number;
  label: string;
}

interface ReviewFormProps {
  submissionId: number;
  criteria: Criterion[];
  // The author's own submission: the form is shown, switched off, with the
  // reason above it. The API refuses it anyway (INV-2).
  disabled?: boolean;
}

// One rating per criterion, in the criteria's order. 0 is the unchosen state,
// so a missing rating fails the minimum instead of needing its own check.
const buildSchema = (count: number) =>
  z.object({
    feedback: z
      .string()
      .trim()
      .min(20, "Use at least 20 characters")
      .max(2000, "Use at most 2000 characters"),
    ratings: z
      .array(
        z
          .number()
          .int()
          .min(1, "Rate this criterion from 1 to 5")
          .max(5, "Rate this criterion from 1 to 5"),
      )
      .length(count),
  });

type FormValues = z.input<ReturnType<typeof buildSchema>>;

export function ReviewForm({
  submissionId,
  criteria,
  disabled = false,
}: ReviewFormProps) {
  const mutation = useCreateReview(submissionId);
  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(criteria.length)),
    defaultValues: { feedback: "", ratings: criteria.map(() => 0) },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit((values) => {
    // A double click sends one request: the second is dropped here, and the
    // button is disabled for the length of the first. The mutation stays
    // pending until the detail page has refreshed, so the button does not
    // come back before the form is replaced.
    if (mutation.isPending || mutation.isSuccess) return;

    mutation.mutate({
      feedback: values.feedback,
      ratings: criteria.map((criterion, index) => ({
        criterionId: criterion.id,
        rating: values.ratings[index],
      })),
    });
  });

  return (
    <Surface>
      <h2 className="text-heading font-medium">Review this code</h2>
      <p className="mt-1 text-small text-muted-foreground">
        Write what you would tell the author, then rate each criterion from 1 to
        5. You earn karma for the review. A review cannot be edited or removed
        once it is posted.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-5">
        <fieldset disabled={disabled} className="space-y-4">
          <Field
            label="Feedback"
            htmlFor="feedback"
            error={errors.feedback?.message}
          >
            <Textarea
              id="feedback"
              rows={6}
              aria-invalid={errors.feedback ? true : undefined}
              {...register("feedback")}
            />
          </Field>

          <div className="space-y-3">
            <p className="text-small font-medium">Ratings</p>
            {criteria.map((criterion, index) => (
              <div key={criterion.id}>
                <div className="flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 text-small [overflow-wrap:anywhere]">
                    {criterion.label}
                  </span>
                  <Controller
                    control={control}
                    name={`ratings.${index}` as const}
                    render={({ field }) => (
                      <RatingInput
                        name={`rating-${criterion.id}`}
                        label={criterion.label}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
                {errors.ratings?.[index]?.message && (
                  <p role="alert" className="mt-1 text-small text-destructive">
                    {errors.ratings[index].message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <FormError error={mutation.error} />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={mutation.isPending || mutation.isSuccess}
            >
              {mutation.isPending ? "Posting" : "Post review"}
            </Button>
          </div>
        </fieldset>
      </form>
    </Surface>
  );
}
