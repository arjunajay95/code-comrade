import { userRepository } from "../repository/user.repository.js";
import { ConflictError, NotFoundError } from "../errors/index.js";
import type { UpdateMeBody } from "../models/user.schemas.js";

export const userService = {
  async getMe(userId: number) {
    const [profile, reviewsReceived] = await Promise.all([
      userRepository.findProfileById(userId),
      userRepository.countReviewsReceived(userId),
    ]);

    // requireAuth guarantees the row existed moments ago, so this only
    // happens if it was deleted in between.
    if (!profile) {
      throw new NotFoundError("User not found", "NOT_FOUND");
    }

    const { _count, ...rest } = profile;
    return {
      ...rest,
      stats: {
        submissions: _count.submissions,
        reviewsGiven: _count.reviews,
        reviewsReceived,
      },
    };
  },

  async updateMe(userId: number, changes: UpdateMeBody) {
    const updated = await userRepository.updateProfile(userId, changes);
    if (!updated) {
      throw new ConflictError("That username is already taken", "CONFLICT");
    }

    // Returns the same shape as GET /users/me, so the client can replace its
    // cached profile with the response directly.
    return userService.getMe(userId);
  },

  // Public view of any user. Built field by field, rather than by removing
  // fields from the database row, so a field added to the profile query
  // later can never reach the public response by accident.
  async getPublicProfile(username: string) {
    const profile = await userRepository.findProfileByUsername(username);
    if (!profile) {
      throw new NotFoundError("User not found", "NOT_FOUND");
    }

    const reviewsReceived = await userRepository.countReviewsReceived(
      profile.id,
    );

    return {
      username: profile.username,
      bio: profile.bio,
      karma: profile.karma,
      createdAt: profile.createdAt,
      technologies: profile.technologies,
      stats: {
        submissions: profile._count.submissions,
        reviewsGiven: profile._count.reviews,
        reviewsReceived,
      },
    };
  },
};
