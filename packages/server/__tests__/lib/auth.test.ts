import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractUser, requireRole } from "../../src/lib/auth";
import type { APIGatewayProxyEvent } from "aws-lambda";

const mockSend = vi.fn();
const mockDb = { send: mockSend } as any;

const mockEvent = (sub?: string): APIGatewayProxyEvent =>
  ({
    requestContext: {
      authorizer: {
        jwt: {
          claims: sub ? { sub, email: "test@test.com" } : {},
        },
      },
    },
  } as any);

describe("extractUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USERS_TABLE = "users";
  });

  it("returns user when sub exists and user found in DB", async () => {
    mockSend.mockResolvedValue({
      Items: [
        {
          id: "user-123",
          email: "test@test.com",
          name: "Jamie",
          role: "attendee",
        },
      ],
    });

    const user = await extractUser(mockEvent("user-123"), mockDb);

    expect(user.id).toBe("user-123");
    expect(user.email).toBe("test@test.com");
    expect(user.name).toBe("Jamie");
    expect(user.role).toBe("attendee");
  });

  it("throws when no sub in claims", async () => {
    await expect(extractUser(mockEvent(), mockDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when user not found in DB", async () => {
    mockSend.mockResolvedValue({ Items: [] });
    await expect(extractUser(mockEvent("user-123"), mockDb)).rejects.toThrow(
      "User not found"
    );
  });

  it("defaults name to email when name is missing", async () => {
    mockSend.mockResolvedValue({
      Items: [{ id: "user-123", email: "test@test.com", role: "attendee" }],
    });

    const user = await extractUser(mockEvent("user-123"), mockDb);
    expect(user.name).toBe("test@test.com");
  });

  it("defaults role to attendee when role is missing", async () => {
    mockSend.mockResolvedValue({
      Items: [{ id: "user-123", email: "test@test.com", name: "Jamie" }],
    });

    const user = await extractUser(mockEvent("user-123"), mockDb);
    expect(user.role).toBe("attendee");
  });
});

describe("requireRole", () => {
  const attendee = {
    id: "1",
    email: "a@a.com",
    name: "A",
    role: "attendee" as const,
  };
  const organizer = {
    id: "2",
    email: "b@b.com",
    name: "B",
    role: "organizer" as const,
  };

  it("returns null when role matches", () => {
    expect(requireRole(attendee, "attendee")).toBeNull();
    expect(requireRole(organizer, "organizer")).toBeNull();
  });

  it("returns 403 error when role does not match", () => {
    const result = requireRole(attendee, "organizer");
    expect(result).not.toBeNull();
    expect(result?.statusCode).toBe(403);
    const body = JSON.parse(result?.body ?? "{}");
    expect(body.error).toBe("Insufficient permissions");
  });
});
