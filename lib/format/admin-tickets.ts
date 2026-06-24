export function formatTicketNumber(number: number): string {
  return `SUP-${String(number).padStart(4, "0")}`;
}
