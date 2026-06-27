/** en-ZA calendar date with a fixed timezone so SSR and client hydration match. */
export function formatDateEnZA(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

/** en-ZA date + time with a fixed timezone so SSR and client hydration match. */
export function formatDateTimeEnZA(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  }).format(date);
}
