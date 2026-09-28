import { prisma } from "../config/prisma.js";

export const technologyRepository = {
  // Alphabetical, which is what a picker needs. name is unique, so the order
  // is always stable without a tiebreaker.
  async list(skip: number, take: number) {
    const [items, total] = await Promise.all([
      prisma.technology.findMany({
        orderBy: { name: "asc" },
        skip,
        take,
        select: { id: true, name: true },
      }),
      prisma.technology.count(),
    ]);
    return { items, total };
  },
};
