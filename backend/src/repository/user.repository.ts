import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import type { AuthUser } from "../types/express.js";

// The only fields requireAuth ever loads. clerkId is never selected, so it
// cannot leak into req.user or any response built from it.
const authUserSelect = { id: true, username: true, karma: true } as const;

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

  // Everything the own-profile view needs, in one query. clerkId is never
  // selected. Technologies come back sorted, so the order is stable.
  findProfileById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        bio: true,
        karma: true,
        createdAt: true,
        technologies: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { submissions: true, reviews: true } },
      },
    });
  },

  // Reviews other people wrote on this user's submissions. A separate count
  // because it goes through Submission, not through a relation on User.
  countReviewsReceived(authorId: number): Promise<number> {
    return prisma.review.count({ where: { submission: { authorId } } });
  },
};
