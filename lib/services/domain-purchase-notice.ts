export type DomainPurchaseNotice =
  | { status: "connected"; domain: string; message: string }
  | { status: "provisioning"; domain: string; message: string }
  | { status: "error"; domain: string; message: string };

export function parseDomainPurchaseNotice(input: {
  hosting_connected?: string;
  hosting_provisioning?: string;
  hosting_error?: string;
  domain?: string;
  message?: string;
}): DomainPurchaseNotice | null {
  const domain = input.domain?.trim();
  if (!domain) return null;

  if (input.hosting_connected === "1") {
    return {
      status: "connected",
      domain,
      message:
        "Hosting is active and your domain is connected. Add the DNS records below — verification runs automatically.",
    };
  }

  if (input.hosting_provisioning === "1") {
    return {
      status: "provisioning",
      domain,
      message:
        "Payment received. Finishing Plesk setup — this page will update automatically.",
    };
  }

  if (input.hosting_error === "1") {
    return {
      status: "error",
      domain,
      message:
        input.message?.trim() ||
        "Hosting could not be activated. Try again or contact support.",
    };
  }

  return null;
}
