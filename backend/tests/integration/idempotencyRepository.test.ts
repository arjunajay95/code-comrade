import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma.js";
import { idempotencyRepository } from "../../src/repository/idempotency.repository.js";
import { createUser, unique } from "./fixtures.js";

// The repository's guarantees, checked directly. The races the service
// defends against can only be shown to be safe here, one statement at a time,
// because a real race cannot be made to happen on cue.

const MINUTE = 60_000;

const newKey = async () => {
  const user = await createUser();
  return {
    userId: user.id,
    endpoint: "POST /repository-test",
    key: unique("key").replace(/_/g, "-"),
    requestHash: "hash-1",
  };
};

const ageBy = (id: number, minutes: number) =>
  prisma.idempotencyKey.update({
    where: { id },
    data: { createdAt: new Date(Date.now() - minutes * MINUTE) },
  });

describe("idempotencyRepository", () => {
  describe("insertInFlight", () => {
    it("records the key as in flight and returns its id", async () => {
      const input = await newKey();

      const id = await idempotencyRepository.insertInFlight(input);

      expect(id).toEqual(expect.any(Number));
      const row = await prisma.idempotencyKey.findUniqueOrThrow({
        where: { id: id as number },
      });
      expect(row).toMatchObject({
        ...input,
        status: "IN_FLIGHT",
        responseCode: null,
        responseBody: null,
      });
    });

    it("returns null for a key that already exists, and leaves the row alone", async () => {
      const input = await newKey();
      const first = await idempotencyRepository.insertInFlight(input);

      const second = await idempotencyRepository.insertInFlight({
        ...input,
        requestHash: "a-different-hash",
      });

      expect(second).toBeNull();
      const row = await prisma.idempotencyKey.findUniqueOrThrow({
        where: { id: first as number },
      });
      expect(row.requestHash).toBe("hash-1");
    });

    it("lets exactly one of many simultaneous inserts win (INV-5)", async () => {
      const input = await newKey();

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          idempotencyRepository.insertInFlight(input),
        ),
      );

      expect(results.filter((id) => id !== null)).toHaveLength(1);
      expect(
        await prisma.idempotencyKey.count({
          where: { userId: input.userId, key: input.key },
        }),
      ).toBe(1);
    });

    it.each<
      [string, (input: Awaited<ReturnType<typeof newKey>>) => Promise<unknown>]
    >([
      [
        "another user",
        async (input) => ({ ...input, userId: (await createUser()).id }),
      ],
      [
        "another endpoint",
        async (input) => ({ ...input, endpoint: "POST /elsewhere" }),
      ],
    ])(
      "treats the same key for %s as a different key",
      async (_name, change) => {
        const input = await newKey();
        await idempotencyRepository.insertInFlight(input);

        const other = (await change(input)) as Awaited<
          ReturnType<typeof newKey>
        >;

        expect(
          await idempotencyRepository.insertInFlight(other),
        ).not.toBeNull();
      },
    );
  });

  describe("find", () => {
    it("returns what the service needs to decide", async () => {
      const input = await newKey();
      const id = await idempotencyRepository.insertInFlight(input);

      const found = await idempotencyRepository.find(
        input.userId,
        input.endpoint,
        input.key,
      );

      expect(found).toMatchObject({
        id,
        requestHash: "hash-1",
        status: "IN_FLIGHT",
        responseCode: null,
        responseBody: null,
      });
      expect(found?.createdAt).toBeInstanceOf(Date);
    });

    it("returns null for a key it has never seen", async () => {
      const input = await newKey();

      expect(
        await idempotencyRepository.find(
          input.userId,
          input.endpoint,
          input.key,
        ),
      ).toBeNull();
    });

    it("looks the key up within the user and the endpoint", async () => {
      const input = await newKey();
      await idempotencyRepository.insertInFlight(input);
      const someoneElse = await createUser();

      expect(
        await idempotencyRepository.find(
          someoneElse.id,
          input.endpoint,
          input.key,
        ),
      ).toBeNull();
      expect(
        await idempotencyRepository.find(
          input.userId,
          "POST /elsewhere",
          input.key,
        ),
      ).toBeNull();
    });
  });

  describe("complete", () => {
    it("stores the response and marks the key completed", async () => {
      const input = await newKey();
      const id = (await idempotencyRepository.insertInFlight(input)) as number;

      await idempotencyRepository.complete(id, 201, {
        success: true,
        data: { id: 9, tags: ["a", "b"] },
      });

      expect(
        await idempotencyRepository.find(
          input.userId,
          input.endpoint,
          input.key,
        ),
      ).toMatchObject({
        status: "COMPLETED",
        responseCode: 201,
        responseBody: { success: true, data: { id: 9, tags: ["a", "b"] } },
      });
    });
  });

  // The conditional UPDATE that takes over a stale key (PROJECT_BLUEPRINT
  // section 9, step 6). Each condition is checked on its own, because the
  // service's own staleness check would otherwise hide a missing one.
  describe("takeOver", () => {
    const cutoff = () => new Date(Date.now() - 5 * MINUTE);

    it("takes over a key that is in flight and older than the cutoff", async () => {
      const id = (await idempotencyRepository.insertInFlight(
        await newKey(),
      )) as number;
      await ageBy(id, 10);

      expect(await idempotencyRepository.takeOver(id, cutoff())).toBe(true);
    });

    it("restarts the in-flight clock, so a second takeover finds nothing to take", async () => {
      const id = (await idempotencyRepository.insertInFlight(
        await newKey(),
      )) as number;
      await ageBy(id, 10);
      const sameCutoff = cutoff();

      const first = await idempotencyRepository.takeOver(id, sameCutoff);
      const second = await idempotencyRepository.takeOver(id, sameCutoff);

      expect([first, second]).toEqual([true, false]);
      const row = await prisma.idempotencyKey.findUniqueOrThrow({
        where: { id },
      });
      expect(row.createdAt.getTime()).toBeGreaterThan(sameCutoff.getTime());
    });

    it("lets exactly one of many simultaneous takeovers win", async () => {
      const id = (await idempotencyRepository.insertInFlight(
        await newKey(),
      )) as number;
      await ageBy(id, 10);
      const sameCutoff = cutoff();

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          idempotencyRepository.takeOver(id, sameCutoff),
        ),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it("leaves a key younger than the cutoff alone", async () => {
      const id = (await idempotencyRepository.insertInFlight(
        await newKey(),
      )) as number;
      await ageBy(id, 4);

      expect(await idempotencyRepository.takeOver(id, cutoff())).toBe(false);
    });

    it("never touches a completed key, however old", async () => {
      const id = (await idempotencyRepository.insertInFlight(
        await newKey(),
      )) as number;
      await idempotencyRepository.complete(id, 201, { success: true });
      await ageBy(id, 600);

      expect(await idempotencyRepository.takeOver(id, cutoff())).toBe(false);
      const row = await prisma.idempotencyKey.findUniqueOrThrow({
        where: { id },
      });
      expect(row).toMatchObject({ status: "COMPLETED", responseCode: 201 });
    });

    it("changes nothing but the clock, and never deletes", async () => {
      const input = await newKey();
      const id = (await idempotencyRepository.insertInFlight(input)) as number;
      await ageBy(id, 10);
      const before = await prisma.idempotencyKey.findUniqueOrThrow({
        where: { id },
      });

      await idempotencyRepository.takeOver(id, cutoff());

      const after = await prisma.idempotencyKey.findUniqueOrThrow({
        where: { id },
      });
      expect({ ...after, createdAt: null }).toEqual({
        ...before,
        createdAt: null,
      });
      expect(
        await prisma.idempotencyKey.count({ where: { userId: input.userId } }),
      ).toBe(1);
    });

    it("answers false for a key that does not exist", async () => {
      expect(
        await idempotencyRepository.takeOver(2_147_483_647, cutoff()),
      ).toBe(false);
    });
  });
});
