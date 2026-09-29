// Replaces a non-null assertion (!) in seed code. If a lookup comes back
// empty, which only happens when the seed data itself has a mistake such as
// a misspelled tag, this fails immediately and names the missing item,
// instead of passing undefined along to fail somewhere confusing later.
export const required = <T>(value: T | undefined, description: string): T => {
  if (value === undefined) {
    throw new Error(`Seed data error: missing ${description}`);
  }
  return value;
};
