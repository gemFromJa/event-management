// packages/client/__tests__/fetchWithAuth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveTokens, getAccessToken } from "../src/lib/auth";
import { fetchWithAuth } from "../src/lib/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("window", { location: { href: "" } });

const mockResponse = (status: number, body: unknown = {}): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

const MOCK_TOKENS = {
  idToken: "mock-id-token",
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
};

const TEST_URL = "https://api.test.com/events";

describe("fetchWithAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    window.location.href = "";
  });

  describe("happy path", () => {
    it("attaches Authorization header when access token exists", async () => {
      saveTokens(MOCK_TOKENS);
      mockFetch.mockResolvedValueOnce(mockResponse(200));

      await fetchWithAuth(TEST_URL);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["Authorization"]).toBe("Bearer mock-access-token");
    });

    it("sends no Authorization header when no token", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200));

      await fetchWithAuth(TEST_URL);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["Authorization"]).toBeUndefined();
    });

    it("returns response on success", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200));

      const res = await fetchWithAuth(TEST_URL);

      expect(res.status).toBe(200);
    });

    it("passes through non-401 error responses without refreshing", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(403));

      const res = await fetchWithAuth(TEST_URL);

      expect(res.status).toBe(403);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("401 handling", () => {
    it("attempts token refresh on 401", async () => {
      saveTokens(MOCK_TOKENS);

      mockFetch
        .mockResolvedValueOnce(mockResponse(401))
        .mockResolvedValueOnce(
          mockResponse(200, {
            data: { idToken: "new-id", accessToken: "new-access" },
          })
        )
        .mockResolvedValueOnce(mockResponse(200));

      await fetchWithAuth(TEST_URL);

      const refreshCall = mockFetch.mock.calls[1];
      expect(refreshCall[0]).toContain("/auth/refresh");
    });

    it("retries original request with new token after successful refresh", async () => {
      saveTokens(MOCK_TOKENS);

      mockFetch
        .mockResolvedValueOnce(mockResponse(401))
        .mockResolvedValueOnce(
          mockResponse(200, {
            data: { idToken: "new-id", accessToken: "new-access" },
          })
        )
        .mockResolvedValueOnce(mockResponse(200));

      await fetchWithAuth(TEST_URL);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      const retryHeaders = mockFetch.mock.calls[2][1].headers;
      expect(retryHeaders["Authorization"]).toBe("Bearer new-access");
    });

    it("clears tokens when refresh fails", async () => {
      saveTokens(MOCK_TOKENS);

      mockFetch
        .mockResolvedValueOnce(mockResponse(401))
        .mockResolvedValueOnce(mockResponse(401));

      await expect(fetchWithAuth(TEST_URL)).rejects.toThrow(
        "Session expired. Please log in again."
      );

      expect(getAccessToken()).toBeNull();
    });

    it("redirects to /login when refresh fails", async () => {
      saveTokens(MOCK_TOKENS);

      mockFetch
        .mockResolvedValueOnce(mockResponse(401))
        .mockResolvedValueOnce(mockResponse(401));

      await expect(fetchWithAuth(TEST_URL)).rejects.toThrow();

      expect(window.location.href).toBe("/login");
    });

    it("does not attempt refresh when no refresh token", async () => {
      // no tokens — no refresh token available
      mockFetch.mockResolvedValueOnce(mockResponse(401));

      await expect(fetchWithAuth(TEST_URL)).rejects.toThrow(
        "Session expired. Please log in again."
      );

      // only one call — no refresh attempt
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("deduplicates concurrent refresh calls", async () => {
      saveTokens(MOCK_TOKENS);

      mockFetch
        .mockResolvedValueOnce(mockResponse(401))
        .mockResolvedValueOnce(mockResponse(401))
        .mockResolvedValueOnce(
          mockResponse(200, {
            data: { idToken: "new-id", accessToken: "new-access" },
          })
        )
        .mockResolvedValueOnce(mockResponse(200))
        .mockResolvedValueOnce(mockResponse(200));

      await Promise.all([
        fetchWithAuth(TEST_URL),
        fetchWithAuth(`${TEST_URL}/other`),
      ]);

      const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
        (url as string).includes("/auth/refresh")
      );
      expect(refreshCalls).toHaveLength(1);
    });

    it("throws session expired error with correct message", async () => {
      saveTokens(MOCK_TOKENS);

      mockFetch
        .mockResolvedValueOnce(mockResponse(401))
        .mockResolvedValueOnce(mockResponse(401));

      await expect(fetchWithAuth(TEST_URL)).rejects.toThrow(
        "Session expired. Please log in again."
      );
    });
  });
});
