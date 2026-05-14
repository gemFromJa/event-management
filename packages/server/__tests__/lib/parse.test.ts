import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody } from "../../src/lib/parse";

const TestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().positive("Age must be positive"),
});

describe("parseBody", () => {
  describe("valid body", () => {
    it("returns parsed data", () => {
      const result = parseBody(
        JSON.stringify({ name: "Jamie", age: 25 }),
        TestSchema
      );
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ name: "Jamie", age: 25 });
    });

    it("treats null body as empty object", () => {
      const result = parseBody(null, TestSchema);
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe("zod validation errors", () => {
    it('returns 400 with "Validation failed" error', () => {
      const result = parseBody(JSON.stringify({ age: 25 }), TestSchema);
      expect(result.data).toBeNull();
      expect(result.error?.statusCode).toBe(400);
      const body = JSON.parse(result.error?.body || "{}");
      expect(body.error).toBe("Validation failed");
    });

    it("returns field and message for each failed field", () => {
      const result = parseBody(JSON.stringify({ name: "" }), TestSchema);
      const body = JSON.parse(result.error?.body || "{}");
      expect(body.details[0].field).toBe("name");
      expect(body.details[0].message).toBe("Name is required");
    });

    it("returns details for all failed fields", () => {
      const result = parseBody(JSON.stringify({}), TestSchema);
      const body = JSON.parse(result.error?.body || "{}");
      expect(body.details).toHaveLength(2);
    });

    it('returns "unknown" for field when path is empty', () => {
      const SchemaWithRefinement = z
        .object({})
        .refine(() => false, { message: "Always fails" });
      const result = parseBody(JSON.stringify({}), SchemaWithRefinement);
      const body = JSON.parse(result.error?.body || "{}");
      expect(body.details[0].field).toBe("unknown");
    });
  });

  describe("invalid json", () => {
    it('returns 400 with "Invalid request body" for malformed JSON', () => {
      const result = parseBody("not json", TestSchema);
      expect(result.data).toBeNull();
      expect(result.error?.statusCode).toBe(400);
      const body = JSON.parse(result.error?.body || "{}");
      expect(body.error).toBe("Invalid request body");
    });

    it('returns 400 with "Invalid request body" for empty string', () => {
      const result = parseBody("", TestSchema);
      expect(result.data).toBeNull();
      const body = JSON.parse(result.error?.body || "{}");
      expect(body.error).toBe("Invalid request body");
    });
  });
});
