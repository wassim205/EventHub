import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { api, setAccessToken, setSessionExpiredHandler } from "../api/client";
import type { User } from "../api/types";

type SessionStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: User | null;
  status: SessionStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const applySession = useCallback((payload: { accessToken: string; user: User }) => {
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);

    // Au chargement on tente de restaurer la session via le cookie refresh.
    axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then(({ data }) => applySession(data.data))
      .catch(clearSession);
  }, [applySession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post("/auth/login", { email, password });
      applySession(data.data);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider.");
  }
  return context;
}