import { z } from "zod";
import { requestSchema } from "./requestSchema.js";
import { TECHNOLOGY_NAME_MAX_LENGTH } from "./user.schemas.js";

// PostgreSQL's integer type tops out at 2147483647. An id beyond it could
// never exist, and passing it to the database would raise an error rather
// than a clean 404, so it is rejected here as a 400.
const MAX_DB_INT = 2_147_483_647;

// Product limits for a submission. They are held here and nowhere else: no
// CHECK constraint backs them, because they are not integrity rules.
export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MIN_LENGTH = 10;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const GITHUB_URL_MAX_LENGTH = 200;
export const CRITERIA_MIN_COUNT = 1;
export const CRITERIA_MAX_COUNT = 5;
export const CRITERION_LABEL_MIN_LENGTH = 2;
export const CRITERION_LABEL_MAX_LENGTH = 60;
export const SUBMISSION_TECHNOLOGIES_MIN_COUNT = 1;
export const SUBMISSION_TECHNOLOGIES_MAX_COUNT = 8;

// Shared by every route with a submission id in its path.
const submissionIdParams = z
  .object({
    id: z.coerce.number().int().positive().max(MAX_DB_INT),
  })
  .strict();

export const getSubmissionSchema = requestSchema({
  params: submissionIdParams,
});

const titleField = z
  .string()
  .trim()
  .min(TITLE_MIN_LENGTH)
  .max(TITLE_MAX_LENGTH);

const descriptionField = z
  .string()
  .trim()
  .min(DESCRIPTION_MIN_LENGTH)
  .max(DESCRIPTION_MAX_LENGTH);

// The URL is only checked for being a sane-length string here. The strict
// parser runs in the service, so a bad URL answers INVALID_REPO_URL (D-10)
// and not VALIDATION_ERROR. Trimming first means a URL pasted with a stray
// space or newline still works.
const githubUrlField = z.string().trim().max(GITHUB_URL_MAX_LENGTH);

// Normalized first, like a user's stack (D-17), and counted after
// de-duplication: eight spellings of one tag is one tag, not eight.
const technologiesField = z
  .array(z.string().trim().toLowerCase().min(1).max(TECHNOLOGY_NAME_MAX_LENGTH))
  .transform((names) => [...new Set(names)])
  .pipe(
    z
      .array(z.string())
      .min(SUBMISSION_TECHNOLOGIES_MIN_COUNT)
      .max(SUBMISSION_TECHNOLOGIES_MAX_COUNT),
  );

const criterionField = z
  .object({
    label: z
      .string()
      .trim()
      .min(CRITERION_LABEL_MIN_LENGTH)
      .max(CRITERION_LABEL_MAX_LENGTH),
  })
  .strict();

// The database has no unique constraint on a submission's criterion labels,
// so this is the only place two criteria called "Readability" and
// "readability" are caught.
const criteriaField = z
  .array(criterionField)
  .min(CRITERIA_MIN_COUNT)
  .max(CRITERIA_MAX_COUNT)
  .refine(
    (criteria) =>
      new Set(criteria.map((criterion) => criterion.label.toLowerCase()))
        .size === criteria.length,
    "Criterion labels must be unique within a submission",
  );

// The fields a submission's author can change after posting. Create and edit
// share these objects, so the two can never drift apart on a limit.
const editableFields = {
  title: titleField,
  description: descriptionField,
  githubUrl: githubUrlField,
  technologies: technologiesField,
};

// Exactly these five fields. .strict() rejects everything else, authorId and
// karma included, which is the mass assignment control (D-11): the author is
// always the signed-in user.
const createSubmissionBody = z
  .object({ ...editableFields, criteria: criteriaField })
  .strict();

export const createSubmissionSchema = requestSchema({
  body: createSubmissionBody,
});

// The parsed shape, after trimming, lowercasing and de-duplicating. validate
// replaces req.body with exactly this, so the controller can rely on it.
export type CreateSubmissionBody = z.infer<typeof createSubmissionBody>;

// Criteria are absent from the edit body entirely, so .strict() rejects them
// with a 400 like any other unknown field. They are locked because existing
// ratings point at them by id, and an absent field is a smaller surface than
// a guarded one. PUT replaces the four editable fields, so all four are
// required: an edit form sends what it shows.
const updateSubmissionBody = z.object(editableFields).strict();

export const updateSubmissionSchema = requestSchema({
  params: submissionIdParams,
  body: updateSubmissionBody,
});

export type UpdateSubmissionBody = z.infer<typeof updateSubmissionBody>;
