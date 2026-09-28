-- User rules also enforced by Zod at the boundary. The database refuses
-- bad data even if something bypasses the API (DATABASE_SCHEMA_REFERENCE §4).
-- The reserved username list is deliberately not here: it is policy that
-- may change, not a data integrity rule.

ALTER TABLE "User"
  ADD CONSTRAINT "chk_username_format"
  CHECK ("username" ~ '^[a-z0-9_]{3,30}$');

ALTER TABLE "User"
  ADD CONSTRAINT "chk_bio_length"
  CHECK ("bio" IS NULL OR char_length("bio") <= 500);