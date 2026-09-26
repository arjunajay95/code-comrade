import { z } from "zod";
import {
  RESERVED_USERNAMES,
  USERNAME_PATTERN,
} from "../utils/deriveUsername.js";
import { requestSchema } from "./requestSchema.js";

export const BIO_MAX_LENGTH = 500;
export const STACK_MAX_TECHNOLOGIES = 20;
export const TECHNOLOGY_NAME_MAX_LENGTH = 40;

// Accepts no input at all. Any query parameter is rejected rather than
// silently ignored.
export const getMeSchema = requestSchema({});

// Trimmed and lowercased before the format check. Same rules as
// derivation, so an edited username can never be something derivation
// would have refused.
const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    USERNAME_PATTERN,
    "Username must be 3 to 30 lowercase letters, digits, or underscores",
  )
  .refine((name) => !RESERVED_USERNAMES.has(name), "This username is reserved");

// An empty string after trimming means "clear my bio", same as null.
const bioField = z
  .string()
  .trim()
  .max(BIO_MAX_LENGTH)
  .nullable()
  .transform((bio) => (bio === "" ? null : bio));

// Normalized at the boundary, so "React" and " react " are one tag.
// Duplicates are removed after normalizing, since two spellings of the same
// name only become duplicates once lowercased.
const technologiesField = z
  .array(z.string().trim().toLowerCase().min(1).max(TECHNOLOGY_NAME_MAX_LENGTH))
  .max(STACK_MAX_TECHNOLOGIES)
  .transform((names) => [...new Set(names)]);

// Only the three locally owned fields are editable. .strict() rejects
// everything else, karma, clerkId and id included, which is the mass
// assignment control.
const updateMeBody = z
  .object({
    username: usernameField.optional(),
    bio: bioField.optional(),
    technologies: technologiesField.optional(),
  })
  .strict()
  .refine(
    (body) => Object.keys(body).length > 0,
    "Provide at least one field to update",
  );

export const updateMeSchema = requestSchema({ body: updateMeBody });

// The parsed shape, after trimming, lowercasing and de-duplicating. validate
// replaces req.body with exactly this, so the controller can rely on it.
export type UpdateMeBody = z.infer<typeof updateMeBody>;
