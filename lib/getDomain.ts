type HeaderReader = Pick<Headers, "get">;

export function getDomain(headers: HeaderReader): string {
  const host = headers.get("host") || "";
  return host.replace(/^www\./i, "").toLowerCase();
}
