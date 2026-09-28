import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import type { AuthUser } from "../types/express.js";

// The only fields requireAuth ever loads. clerkId is never selected, so it
// cannot leak into req.user or any response built from it.
const authUserSelect = { id: true, username: true, karma: true } as const;

// Everything a profile view needs, shared by the own-profile and public
// lookups. clerkId is never selected. Technologies come back sorted,
// so the order is stable.
const profileSelect = {
  id: true,
  username: true,
  bio: true,
  karma: true,
  createdAt: true,
  technologies: { select: { id: true, name: true }, orderBy: { name: "asc" } },
  _count: { select: { submissions: true, reviews: true } },
} as const;

const isUniqueViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export const userRepository = {
  findAuthUserByClerkId(clerkId: string): Promise<AuthUser | null> {
    return prisma.user.findUnique({
      where: { clerkId },
      select: authUserSelect,
    });
  },

  // Returns null when a unique constraint rejects the insert, which means
  // either the username is taken or a concurrent request already created
  // this user. The service works out which one. Any other error propagates.
  async createAuthUser(
    clerkId: string,
    username: string,
  ): Promise<AuthUser | null> {
    try {
      return await prisma.user.create({
        data: { clerkId, username },
        select: authUserSelect,
      });
    } catch (err) {
      if (isUniqueViolation(err)) return null;
      throw err;
    }
  },

  // Everything the own-profile view needs, in one query.
  findProfileById(id: number) {
    return prisma.user.findUnique({ where: { id }, select: profileSelect });
  },

  findProfileByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      select: profileSelect,
    });
  },

  // Reviews other people wrote on this user's submissions. A separate count
  // because it goes through Submission, not through a relation on User.
  countReviewsReceived(authorId: number): Promise<number> {
    return prisma.review.count({ where: { submission: { authorId } } });
  },

  // Applies a profile update in one transaction, so a failure leaves nothing
  // half written. Returns false when a unique constraint rejects it, which
  // here can only mean the username is taken. Any other error propagates.
  async updateProfile(
    id: number,
    changes: {
      username?: string;
      bio?: string | null;
      technologies?: string[];
    },
  ): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        // Creates any technology that does not exist yet. skipDuplicates
        // makes this safe when two users add the same new tag at the same
        // moment: the loser of that race just skips it (D-17).
        if (changes.technologies?.length) {
          await tx.technology.createMany({
            data: changes.technologies.map((name) => ({ name })),
            skipDuplicates: true,
          });
        }

        await tx.user.update({
          where: { id },
          data: {
            // undefined leaves a field unchanged, so omitted fields are
            // untouched.
            username: changes.username,
            bio: changes.bio,
            // set replaces the whole stack. An empty array clears it.
            technologies: changes.technologies
              ? { set: changes.technologies.map((name) => ({ name })) }
              : undefined,
          },
          // The result is not used, but no query loads more than it needs,
          // clerkId least of all (D-08).
          select: { id: true },
        });
      });
      return true;
    } catch (err) {
      if (isUniqueViolation(err)) return false;
      throw err;
    }
  },
};
