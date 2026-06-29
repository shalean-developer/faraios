import tls from "tls";

function normalizeHostname(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function hostCandidates(domain: string): string[] {
  const host = normalizeHostname(domain);
  if (!host) return [];
  if (host.startsWith("www.")) {
    return [host, host.replace(/^www\./, "")];
  }
  return [host, `www.${host}`];
}

function probeTlsHost(hostname: string, timeoutMs = 10_000): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: true,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        finish(Boolean(cert?.subject));
      }
    );

    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      finish(false);
    });

    socket.on("error", () => {
      socket.destroy();
      finish(false);
    });
  });
}

/** Returns true when the domain serves a valid HTTPS certificate on apex or www. */
export async function probeDomainSslActive(domain: string): Promise<boolean> {
  for (const hostname of hostCandidates(domain)) {
    if (await probeTlsHost(hostname)) {
      return true;
    }
  }
  return false;
}
