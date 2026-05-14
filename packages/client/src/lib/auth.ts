const TOKENS = {
  id: "id_token",
  access: "access_token",
  refresh: "refresh_token",
} as const;

export const saveTokens = ({
  idToken,
  accessToken,
  refreshToken,
}: {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}) => {
  localStorage.setItem(TOKENS.id, idToken);
  localStorage.setItem(TOKENS.access, accessToken);
  localStorage.setItem(TOKENS.refresh, refreshToken);
};

export const getIdToken = (): string | null => localStorage.getItem(TOKENS.id);
export const getAccessToken = (): string | null =>
  localStorage.getItem(TOKENS.access);
export const getRefreshToken = (): string | null =>
  localStorage.getItem(TOKENS.refresh);

export const clearTokens = () => {
  localStorage.removeItem(TOKENS.id);
  localStorage.removeItem(TOKENS.access);
  localStorage.removeItem(TOKENS.refresh);
};
