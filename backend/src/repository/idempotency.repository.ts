import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

const isUniqueViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

// What the service needs to know about a key that already exists.
export interface KeyRecord {
  id: number;
  requestHash: string;
  status: string;
  responseCode: number | null;
  responseBody: unknown;
  createdAt: Date;
}

export interface NewKey {
  userId: number;
  endpoint: string;
  key: string;
  requestHash: string;
}

export const idempotencyRepository = {
  // Records the key as in flight and returns the new row's id, or null when
  // the unique constraint on (userId, endpoint, key) says it already exists.
  // The constraint decides, never a lookup beforehand: two simultaneous first
  // requests cannot both insert (INV-5, D-29). Any other error propagates.
  async insertInFlight(input: NewKey): Promise<number | null> {
    try {
      const row = await prisma.idempotencyKey.create({
        data: { ...input, status: "IN_FLIGHT" },
        select: { id: true },
      });
      return row.id;
    } catch (err) {
      if (isUniqueViolation(err)) return null;
      throw err;
    }
  },

  find(
    userId: number,
    endpoint: string,
    key: string,
  ): Promise<KeyRecord | null> {
    return prisma.idempotencyKey.findUnique({
      where: { userId_endpoint_key: { userId, endpoint, key } },
      select: {
        id: true,
        requestHash: true,
        status: true,
        responseCode: true,
        responseBody: true,
        createdAt: true,
      },
    });
  },

  // The conditional UPDATE that takes over a stale key (PROJECT_BLUEPRINT
  // section 9, step 6): it changes the row only while it is still IN_FLIGHT
  // and older than the cutoff, and reports whether it did. It is never a
  // delete (D-03). Setting createdAt to now restarts the in-flight clock for
  // the new owner, so a second simultaneous takeover matches nothing and
  // loses. Exactly one request can win.
  async takeOver(id: number, cutoff: Date): Promise<boolean> {
    const { count } = await prisma.idempotencyKey.updateMany({
      where: { id, status: "IN_FLIGHT", createdAt: { lt: cutoff } },
      data: { createdAt: new Date() },
    });
    return count === 1;
  },

  // Stores the response against the key. The body is always the JSON envelope
  // the API sends, an object, so the cast states a fact.
  async complete(
    id: number,
    responseCode: number,
    responseBody: unknown,
  ): Promise<void> {
    await prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: "COMPLETED",
        responseCode,
        responseBody: responseBody as Prisma.InputJsonValue,
      },
    });
  },
};
