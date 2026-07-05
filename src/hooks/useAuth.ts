"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  username: string;
  email: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AUTH_CHANGED_EVENT = "linkx-auth-changed";

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function parseJwt(token: string): { userId: string; username: string; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.type !== "user" || !payload.userId || !payload.username) return null;
    return payload;
  } catch {
    return null;
  }
}

export function useAuth() {
  // Start loading:true so consumers wait for localStorage check before acting
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("user_token");
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    const payload = parseJwt(token);
    if (!payload || payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("user_token");
      setState({ user: null, loading: false, error: null });
      return;
    }
    // Set state immediately from JWT for fast render
    setState({ user: { id: payload.userId, username: payload.username, email: null }, loading: false, error: null });
    // Then ping the server to update lastSeenAt and check ban/force-logout
    try {
      const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        // Token invalidated / force-logged out
        localStorage.removeItem("user_token");
        setState({ user: null, loading: false, error: null });
      } else if (res.status === 403) {
        // Banned
        const data = await res.json();
        const until = data.bannedUntil ? new Date(data.bannedUntil).toLocaleDateString() : "further notice";
        localStorage.removeItem("user_token");
        setState({ user: null, loading: false, error: `Your account has been banned until ${until}.` });
      }
    } catch {
      // Network error — keep state, don't log out
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleAuthChanged = () => {
      checkAuth();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user_token") checkAuth();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("user_token", data.token);
      setState({ user: data.user, loading: false, error: null });
      notifyAuthChanged();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  };

  const signup = async (username: string, password: string, email?: string) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      localStorage.setItem("user_token", data.token);
      setState({ user: data.user, loading: false, error: null });
      notifyAuthChanged();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("user_token");
    setState({ user: null, loading: false, error: null });
    notifyAuthChanged();
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    login,
    signup,
    logout,
    checkAuth,
  };
}
