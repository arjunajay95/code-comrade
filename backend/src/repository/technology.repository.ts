import { prisma } from "../config/prisma.js";

export const technologyRepository = {
  // Alphabetical, optionally narrowed to names containing the search term.
  // The same filter goes to both queries, so the count always matches.
  async list(skip: number, take: number, search?: string) {
    const where = search ? { name: { contains: search } } : {};
    const [items, total] = await Promise.all([
      prisma.technology.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
        select: { id: true, name: true },
      }),
      prisma.technology.count({ where }),
    ]);
    return { items, total };
  },
};
