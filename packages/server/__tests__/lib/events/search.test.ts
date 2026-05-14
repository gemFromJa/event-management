// packages/server/src/__tests__/search.test.ts
import { describe, it, expect } from "vitest";
import { buildQuery } from "../../../src/lib/events/search";

describe("buildQuery", () => {
  it("returns empty query and attributes when no filters", () => {
    const result = buildQuery({});
    expect(result.query).toBe("");
    expect(result.attributes).toEqual({});
  });

  it("searches by title — lowercased", () => {
    const result = buildQuery({ title: "Demon Slayer" });
    expect(result.query).toBe("contains(titleLower, :title)");
    expect(result.attributes[":title"]).toBe("demon slayer");
  });

  it("filters by category — lowercased", () => {
    const result = buildQuery({ category: "Premiere" });
    expect(result.query).toBe("category = :category");
    expect(result.attributes[":category"]).toBe("premiere");
  });

  it('ignores category when value is "All"', () => {
    const result = buildQuery({ category: "All" });
    expect(result.query).toBe("");
    expect(result.attributes).toEqual({});
  });

  it("filters by single date", () => {
    const result = buildQuery({ date: "2026-06-14" });
    expect(result.query).toBe("#dt = :date");
    expect(result.attributes[":date"]).toBe("2026-06-14");
  });

  it("filters by date range", () => {
    const result = buildQuery({ dateFrom: "2026-06-01", dateTo: "2026-06-30" });
    expect(result.query).toBe("#dt BETWEEN :start AND :end");
    expect(result.attributes[":start"]).toBe("2026-06-01");
    expect(result.attributes[":end"]).toBe("2026-06-30");
  });

  it("filters by dateFrom only", () => {
    const result = buildQuery({ dateFrom: "2026-06-01" });
    expect(result.query).toBe("#dt >= :start");
    expect(result.attributes[":start"]).toBe("2026-06-01");
    expect(result.attributes[":end"]).toBeUndefined();
  });

  it("filters by dateTo only", () => {
    const result = buildQuery({ dateTo: "2026-06-30" });
    expect(result.query).toBe("#dt <= :end");
    expect(result.attributes[":end"]).toBe("2026-06-30");
    expect(result.attributes[":start"]).toBeUndefined();
  });

  it("prefers single date over range when both provided", () => {
    const result = buildQuery({
      date: "2026-06-14",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    expect(result.query).toBe("#dt = :date");
    expect(result.attributes[":date"]).toBe("2026-06-14");
    expect(result.attributes[":start"]).toBeUndefined();
  });

  it("combines title and category with AND", () => {
    const result = buildQuery({ title: "ghibli", category: "Premiere" });
    expect(result.query).toBe(
      "contains(titleLower, :title) AND category = :category"
    );
    expect(result.attributes[":title"]).toBe("ghibli");
    expect(result.attributes[":category"]).toBe("premiere");
  });

  it("combines title, category and date range", () => {
    const result = buildQuery({
      title: "anime",
      category: "Convention",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    expect(result.query).toBe(
      "contains(titleLower, :title) AND category = :category AND #dt BETWEEN :start AND :end"
    );
    expect(result.attributes[":title"]).toBe("anime");
    expect(result.attributes[":category"]).toBe("convention");
    expect(result.attributes[":start"]).toBe("2026-06-01");
    expect(result.attributes[":end"]).toBe("2026-06-30");
  });
});
