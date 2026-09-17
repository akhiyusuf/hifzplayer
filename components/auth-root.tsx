"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AuthSnapshot = {
  loaded: boolean;
  accountsOn: boolean;
  accountsReady: boolean;
  signedIn: boolean;
  userId: string | null;
  email: string;
  name: string;
};

const empty: AuthSnapshot = {
  loaded: false,
  accountsOn: false,
  accountsReady: false,
  signedIn: false,
  userId: null,
  email: "",
  name: "",
};

type AuthContextValue = AuthSnapshot & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  ...empty,
  refresh: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthRoot({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthSnapshot>(empty);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      const data = (await res.json()) as Partial<AuthSnapshot>;
      setState({
        loaded: true,
        accountsOn: Boolean(data.accountsOn),
        accountsReady: Boolean(data.accountsReady),
        signedIn: Boolean(data.signedIn),
        userId: data.userId || null,
        email: data.email || "",
        name: data.name || "",
      });
    } catch {
      setState({ ...empty, loaded: true });
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ ...state, refresh, signOut }), [state, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
