import { NotFoundError } from "../errors/index.js";
import { userRepository } from "../repository/user.repository.js";

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
};
