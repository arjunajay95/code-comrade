import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma.js";
import { userRepository } from "../../src/repository/user.repository.js";
import { createUser, unique } from "./fixtures.js";

// The repository's own contract, called directly. The routes cover the happy
// paths. These are the edges a route cannot reach: the answer for a user that
// does not exist, and what happens when the database refuses something for a
// reason other than a unique constraint.

const NO_SUCH_USER = 2_147_483_647;

describe("userRepository", () => {
  describe("findTechnologyIds", () => {
    it("returns the ids of the user's stack", async () => {
      const tag = unique("tag");
      const user = await createUser();
      await prisma.user.update({
        where: { id: user.id },
        data: { technologies: { create: [{ name: tag }] } },
      });
      const technology = await prisma.technology.findUniqueOrThrow({
        where: { name: tag },
        select: { id: true },
      });

      expect(await userRepository.findTechnologyIds(user.id)).toEqual([
        technology.id,
      ]);
    });

    it("returns an empty list, not an error, for a user that does not exist", async () => {
      expect(await userRepository.findTechnologyIds(NO_SUCH_USER)).toEqual([]);
    });
  });

  describe("createAuthUser", () => {
    it("creates the user and returns only what the guard needs", async () => {
      const clerkId = unique("clerk");
      const username = unique("fresh");

      const created = await userRepository.createAuthUser(clerkId, username);

      expect(created).toEqual({
        id: expect.any(Number) as unknown,
        username,
        karma: 0,
      });
    });

    it("returns null when the username is taken", async () => {
      const taken = await createUser();

      expect(
        await userRepository.createAuthUser(unique("clerk"), taken.username),
      ).toBeNull();
    });

    it("returns null when that Clerk user already has a row", async () => {
      const clerkId = unique("clerk");
      await userRepository.createAuthUser(clerkId, unique("first"));

      expect(
        await userRepository.createAuthUser(clerkId, unique("second")),
      ).toBeNull();
    });

    it("lets any other database refusal through instead of calling it a conflict", async () => {
      // A username the CHECK constraint refuses is not a unique violation, so
      // it must surface as an error, never as the null that means "taken".
      await expect(
        userRepository.createAuthUser(unique("clerk"), "Not A Valid Name!"),
      ).rejects.toThrow();
      expect(
        await prisma.user.count({ where: { username: "Not A Valid Name!" } }),
      ).toBe(0);
    });
  });

  describe("updateProfile", () => {
    it("returns true when the change is applied", async () => {
      const user = await createUser();

      expect(
        await userRepository.updateProfile(user.id, { bio: "Hello." }),
      ).toBe(true);
    });

    it("returns false when the username is taken, and rolls back the rest of the change", async () => {
      const taken = await createUser();
      const user = await createUser();
      const tag = unique("rolledback");

      const result = await userRepository.updateProfile(user.id, {
        username: taken.username,
        technologies: [tag],
      });

      expect(result).toBe(false);
      expect(await prisma.technology.count({ where: { name: tag } })).toBe(0);
    });

    it("lets any other database refusal through instead of returning false", async () => {
      // No such user: the update fails with "record not found", which is not a
      // unique violation, so it must surface as an error.
      await expect(
        userRepository.updateProfile(NO_SUCH_USER, { bio: "Nobody's." }),
      ).rejects.toThrow();
    });
  });
});
