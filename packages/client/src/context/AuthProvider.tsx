import { useState } from "react";
import { getIdToken, clearTokens } from "@/lib/auth";
import { AuthContext, type AuthUser } from "./AuthContext";
import { useQueryClient } from "@tanstack/react-query";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const token = getIdToken();
      if (!token) return null;

      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        id: payload.sub,
        idToken: token,
        email: payload.email,
        name: payload.name,
        role: payload["custom:role"],
      };
    } catch (error) {
      console.error("Failed to parse token:", error);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const signout = () => {
    clearTokens();
    queryClient.clear();
    setUser(null);
  };

  const signin = (user: AuthUser | null) => {
    setUser(user);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signout, setUser: signin }}>
      {children}
    </AuthContext.Provider>
  );
}
