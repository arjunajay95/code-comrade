import { clerkClient } from "../../src/config/clerk.js";
import { prisma } from "../../src/config/prisma.js";
import { unique } from "./fixtures.js";

export type Slot = "a" | "b" | "c" | "d";
const SLOTS: readonly Slot[] = ["a", "b", "c", "d"];

// Clerk session tokens last about a minute, so a token is reused for 45
// seconds. One mint per slot covers a whole test file.
const TOKEN_TTL_MS = 45_000;

const tokens = new Map<
  string,
  { promise: Promise<string>; mintedAt: number }
>();

const clerkIdFor = (slot: Slot): string => {
  const id = (process.env.CLERK_TEST_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)[SLOTS.indexOf(slot)];
  if (!id)
    throw new Error(
      `No Clerk test user for slot ${slot}. Check CLERK_TEST_USER_IDS.`,
    );
  return id;
};

// The promise is cached, not the value, so concurrent callers share one mint.
const tokenFor = (clerkUserId: string): Promise<string> => {
  const cached = tokens.get(clerkUserId);
  if (cached && Date.now() - cached.mintedAt < TOKEN_TTL_MS)
    return cached.promise;

  const promise = (async () => {
    const session = await clerkClient.sessions.createSession({
      userId: clerkUserId,
    });
    const { jwt } = await clerkClient.sessions.getToken(session.id);
    return jwt;
  })();
  tokens.set(clerkUserId, { promise, mintedAt: Date.now() });
  // A failed mint must not be served to the next caller.
  promise.catch(() => tokens.delete(clerkUserId));
  return promise;
};

export const bearerFor = async (slot: Slot): Promise<string> =>
  `Bearer ${await tokenFor(clerkIdFor(slot))}`;

// clerkId is unique, so freeing a slot means renaming the clerkId of whoever
// holds it. The old row and everything it owns stays in the database.
export const releaseSlot = async (slot: Slot): Promise<void> => {
  const clerkId = clerkIdFor(slot);
  await prisma.user.updateMany({
    where: { clerkId },
    data: { clerkId: `parked_${unique("p")}_${clerkId}` },
  });
};

export interface Actor {
  id: number;
  username: string;
  authorization: string;
}

// A fresh local user bound to a real Clerk identity, with karma 0 and no data,
// plus a real session token for it. A token identifies the Clerk user and not
// the local row, so one slot is one acting user at a time. Leasing the same
// slot again points that slot's token at the new user, and a test that needs
// three distinct actors uses three slots.
export const actAs = async (slot: Slot): Promise<Actor> => {
  await releaseSlot(slot);
  const user = await prisma.user.create({
    data: { clerkId: clerkIdFor(slot), username: unique("u") },
    select: { id: true, username: true },
  });
  return {
    id: user.id,
    username: user.username,
    authorization: await bearerFor(slot),
  };
};
