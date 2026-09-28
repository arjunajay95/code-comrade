import { buildMeta, toSkip, type Pagination } from "../models/pagination.js";
import { technologyRepository } from "../repository/technology.repository.js";

export const technologyService = {
  async list(pagination: Pagination) {
    const { items, total } = await technologyRepository.list(
      toSkip(pagination),
      pagination.limit,
    );
    return { data: items, meta: buildMeta(total, pagination) };
  },
};
