"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  ADMIN_THEME_CHANGE_EVENT,
  ADMIN_THEME_STORAGE_KEY,
  type AdminTheme,
  readAdminThemePreference,
} from "@/lib/constants/admin-theme";

type AdminThemeContextValue = {
  theme: AdminTheme;
  effectiveTheme: "light" | "dark";
  hydrated: boolean;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

const emptySubscribe = () => () => {};

function subscribeAdminTheme(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(ADMIN_THEME_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ADMIN_THEME_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSystemDarkSnapshot(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeSystemTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onStoreChange();
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const storedTheme = useSyncExternalStore(
    subscribeAdminTheme,
    readAdminThemePreference,
    () => "light" as AdminTheme
  );
  const systemDark = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemDarkSnapshot,
    () => false
  );

  const theme = hydrated ? storedTheme : ("light" as AdminTheme);

  const effectiveTheme = useMemo<"light" | "dark">(() => {
    if (!hydrated) return "light";
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";
    return systemDark ? "dark" : "light";
  }, [hydrated, theme, systemDark]);

  const setTheme = useCallback((next: AdminTheme) => {
    try {
      window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(ADMIN_THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    const next = effectiveTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [effectiveTheme, setTheme]);

  const value = useMemo(
    () => ({ theme, effectiveTheme, hydrated, setTheme, toggleTheme }),
    [theme, effectiveTheme, hydrated, setTheme, toggleTheme]
  );

  return (
    <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return context;
}

export function useAdminThemeOptional() {
  return useContext(AdminThemeContext);
}
