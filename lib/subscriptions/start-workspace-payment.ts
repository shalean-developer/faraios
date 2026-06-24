import { normalizePlanSlug } from "@/lib/data/pricing";

export type StartWorkspacePaymentInput = {
  companyId: string;
  plan?: string | null;
  email: string;
};

export type StartWorkspacePaymentResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; error: string };

export async function startWorkspacePayment(
  input: StartWorkspacePaymentInput
): Promise<StartWorkspacePaymentResult> {
  const email = input.email.trim();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid billing email is required." };
  }

  const res = await fetch("/api/paystack/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyId: input.companyId,
      plan: normalizePlanSlug(input.plan),
      email,
    }),
  });

  const data = (await res.json()) as {
    ok: boolean;
    authorizationUrl?: string;
    reference?: string;
    error?: string;
  };

  if (!res.ok || !data.ok || !data.authorizationUrl) {
    return {
      ok: false,
      error: data.error ?? "Failed to initialize payment.",
    };
  }

  return {
    ok: true,
    authorizationUrl: data.authorizationUrl,
    reference: data.reference ?? "",
  };
}
