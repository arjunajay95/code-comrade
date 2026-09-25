import { prisma } from "../config/prisma.js";

export const healthRepository = {
  async pingDatabase(): Promise<void> {
    // The smallest possible DB round trip
    await prisma.$queryRaw`SELECT 1`;
  },
};
