import { z } from "zod";
import { error } from "./response";

export const parseBody = <T>(
  body: string | null,
  schema: z.ZodSchema<T>
):
  | { data: T; error: null }
  | { data: null; error: ReturnType<typeof error> } => {
  try {
    const data = schema.parse(JSON.parse(body ?? "{}"));
    return { data, error: null };
  } catch (err) {
    console.error("Input validation error:", err);

    if (err instanceof z.ZodError) {
      return {
        data: null,
        error: error({
          code: 400,
          error: "Validation failed",
          details: err.issues.map((issue) => ({
            field: String(issue.path[0] ?? "unknown"),
            message: issue.message,
          })),
        }),
      };
    }

    return {
      data: null,
      error: error({ code: 400, error: "Invalid request body" }),
    };
  }
};
