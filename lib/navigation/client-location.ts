/** Full navigation that avoids the App Router action queue (safe during early mount). */
export function replaceClientLocation(url: string): void {
  if (typeof window === "undefined") return;
  window.location.replace(url);
}

export function assignClientLocation(url: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(url);
}
