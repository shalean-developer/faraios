export const ADMIN_THEME_STORAGE_KEY = "faraios.admin-theme";

export type AdminTheme = "light" | "dark" | "system";

export const ADMIN_THEME_CHANGE_EVENT = "faraios:admin-theme-change";

export function isAdminTheme(value: string | null | undefined): value is AdminTheme {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveAdminTheme(value: string | null | undefined): AdminTheme {
  return isAdminTheme(value) ? value : "light";
}

export function readAdminThemePreference(): AdminTheme {
  if (typeof window === "undefined") return "light";
  try {
    return resolveAdminTheme(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY));
  } catch {
    return "light";
  }
}

export function resolveEffectiveAdminTheme(theme: AdminTheme): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
