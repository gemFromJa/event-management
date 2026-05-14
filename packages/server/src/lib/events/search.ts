import type { SearchEventsInput } from "@event-manager/shared";

export const buildQuery = (data: SearchEventsInput) => {
  const query: string[] = [];
  const attributes: Record<string, string | number> = {};

  if (data.title) {
    query.push("contains(titleLower, :title)");
    attributes[":title"] = data.title.toLowerCase();
  }

  if (data.category && data.category !== "All") {
    query.push("category = :category");
    attributes[":category"] = data.category.toLowerCase();
  }

  if (data.date) {
    query.push("#dt = :date");
    attributes[":date"] = data.date;
  } else if (data.dateFrom && data.dateTo) {
    query.push("#dt BETWEEN :start AND :end");
    attributes[":start"] = data.dateFrom;
    attributes[":end"] = data.dateTo;
  } else if (data.dateFrom) {
    query.push("#dt >= :start");
    attributes[":start"] = data.dateFrom;
  } else if (data.dateTo) {
    query.push("#dt <= :end");
    attributes[":end"] = data.dateTo;
  }

  return { query: query.join(" AND "), attributes };
};
