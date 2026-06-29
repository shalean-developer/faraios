/** Pure helpers for matching FaraiOS DNS records against Plesk zone records. */

export function normalizeDnsHost(host: string, domain: string): string {
  const lower = host.toLowerCase().replace(/\.$/, "");
  const apex = domain.toLowerCase().replace(/^www\./, "");

  if (lower === "" || lower === "@" || lower === apex) return "@";
  if (lower === "www" || lower === `www.${apex}`) return "www";
  if (lower === "_faraios" || lower === `_faraios.${apex}`) return "_faraios";
  return lower;
}

export function hostsMatch(recordHost: string, wantedHost: string, domain: string): boolean {
  return normalizeDnsHost(recordHost, domain) === normalizeDnsHost(wantedHost, domain);
}

export function valuesMatch(type: string, actual: string, expected: string): boolean {
  if (type.toUpperCase() === "TXT") {
    return actual.replace(/"/g, "").includes(expected.replace(/"/g, ""));
  }
  return actual.toLowerCase().replace(/\.$/, "") === expected.toLowerCase().replace(/\.$/, "");
}

export function domainsMatchForHosting(a: string, b: string): boolean {
  const strip = (value: string) =>
    value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  return strip(a) === strip(b);
}
