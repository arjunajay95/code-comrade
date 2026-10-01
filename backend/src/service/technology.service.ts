import type { ListTechnologiesQuery } from "../models/technology.schemas.js";
import { buildMeta, toSkip } from "../models/pagination.js";
import { technologyRepository } from "../repository/technology.repository.js";

export const technologyService = {
  async list(query: ListTechnologiesQuery) {
    const { items, total } = await technologyRepository.list(
      toSkip(query),
      query.limit,
      query.search,
    );
    return { data: items, meta: buildMeta(total, query) };
  },
};
