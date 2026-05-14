import type { Attendee, CreateEventInput, Event } from "@event-manager/shared";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from "./auth";

const API_URL = import.meta.env.VITE_API_URL;

export interface EventsPage {
  items: Event[];
  cursor?: string;
}

// ── token refresh ──────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const { data } = await res.json();
      saveTokens({
        idToken: data.idToken,
        accessToken: data.accessToken,
        refreshToken,
      });
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── fetch wrapper ──────────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, ...authHeaders() },
  });

  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return fetch(url, {
        ...options,
        headers: { ...options.headers, ...authHeaders() },
      });
    }
    clearTokens();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? "Something went wrong");
  }
  return res.json();
}

// ── events ─────────────────────────────────────────────────────────────────
export async function getEvents(params?: {
  cursor?: string;
  query?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
}): Promise<EventsPage> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.query) searchParams.set("title", params.query);
  if (params?.date) {
    searchParams.set("date", params.date);
  } else {
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
  }
  if (params?.category) searchParams.set("category", params.category);

  const res = await fetch(`${API_URL}/events?${searchParams}`);
  return handleResponse<EventsPage>(res);
}

export async function createEvent(data: CreateEventInput): Promise<Event> {
  const res = await fetchWithAuth(`${API_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Event>(res);
}

export async function registerForEvent(eventId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/events/${eventId}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<void>(res);
}

export async function cancelRegistration(eventId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/events/${eventId}/register`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}

export async function getMyEvents(): Promise<{ data: Event[] }> {
  const res = await fetchWithAuth(`${API_URL}/events/me`);
  return handleResponse(res);
}

export async function getMyRegistrations(): Promise<{ data: Event[] }> {
  const res = await fetchWithAuth(`${API_URL}/attendees/me`);
  return handleResponse(res);
}

export async function getEventRegistrations(
  eventId: string
): Promise<{ data: Attendee[] }> {
  const res = await fetchWithAuth(`${API_URL}/events/${eventId}/attendees`);
  return handleResponse(res);
}

// ── auth ───────────────────────────────────────────────────────────────────
export async function login(data: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<{
    message: string;
    data: { accessToken: string; idToken: string; refreshToken: string };
  }>(res);
}

export async function signup(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<void>(res);
}
