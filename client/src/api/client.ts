import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retried?: boolean;
  }
}

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// L'access token est court : sur un 401 on tente un rafraîchissement une seule
// fois avant de renvoyer l'utilisateur vers la page de connexion.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const { data } = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
        accessToken = data.data.accessToken;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        onSessionExpired?.();
      }
    }

    return Promise.reject(error);
  },
);

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) {
      return body.error.message;
    }
    if (error.code === "ERR_NETWORK") {
      return "Le serveur est injoignable. Vérifiez que l'API est démarrée.";
    }
  }
  return fallback;
}