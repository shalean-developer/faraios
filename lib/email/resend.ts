const RESEND_API_URL = "https://api.resend.com/emails";

export function getResendFromAddress(): string | null {
  return process.env.BOOKING_FROM_EMAIL?.trim() || null;
}

/** Resend test domains only deliver to the account owner unless a domain is verified. */
export function isResendSandboxMode(): boolean {
  if (process.env.RESEND_SANDBOX === "true") return true;
  if (process.env.RESEND_SANDBOX === "false") return false;
  if (process.env.NODE_ENV === "development" && getResendSandboxRedirectEmail()) {
    return true;
  }
  const from = getResendFromAddress() ?? "";
  return from.endsWith("@resend.dev");
}

export function getResendSandboxRedirectEmail(): string | null {
  return (
    process.env.RESEND_SANDBOX_TO?.trim() ||
    process.env.RESEND_ACCOUNT_EMAIL?.trim() ||
    null
  );
}

export function resolveResendRecipients(to: string | string[]): {
  recipients: string[];
  sandboxRedirected: boolean;
  intendedRecipients: string[];
} {
  const intended = (Array.isArray(to) ? to : [to]).map((address) => address.trim()).filter(Boolean);

  if (!isResendSandboxMode()) {
    return { recipients: intended, sandboxRedirected: false, intendedRecipients: intended };
  }

  const redirect = getResendSandboxRedirectEmail();
  if (!redirect || intended.length === 0) {
    return { recipients: intended, sandboxRedirected: false, intendedRecipients: intended };
  }

  return {
    recipients: [redirect],
    sandboxRedirected: true,
    intendedRecipients: intended,
  };
}

export type SendResendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

export type SendResendEmailResult = {
  ok: boolean;
  status: "sent" | "failed";
  errorMessage?: string;
  sandboxRedirected?: boolean;
  deliveredTo?: string[];
};

export async function sendResendEmail(
  input: SendResendEmailInput
): Promise<SendResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = input.from?.trim() || getResendFromAddress();

  if (!apiKey || !from) {
    return {
      ok: false,
      status: "failed",
      errorMessage: "Missing RESEND_API_KEY or BOOKING_FROM_EMAIL",
    };
  }

  const { recipients, sandboxRedirected, intendedRecipients } =
    resolveResendRecipients(input.to);

  if (recipients.length === 0) {
    return { ok: false, status: "failed", errorMessage: "No recipient address." };
  }

  let subject = input.subject;
  let html = input.html;
  if (sandboxRedirected) {
    subject = `[Sandbox → ${intendedRecipients.join(", ")}] ${subject}`;
    html = `<p style="color:#666;font-size:12px;margin:0 0 12px">Resend sandbox mode: this message would have been sent to ${intendedRecipients.join(", ")}.</p>${html}`;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        status: "failed",
        errorMessage: `HTTP ${response.status}: ${body.slice(0, 200)}`,
        sandboxRedirected,
        deliveredTo: recipients,
      };
    }

    return {
      ok: true,
      status: "sent",
      sandboxRedirected,
      deliveredTo: recipients,
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      sandboxRedirected,
      deliveredTo: recipients,
    };
  }
}

export function resendSandboxSetupHint(): string | null {
  if (!isResendSandboxMode()) return null;
  if (getResendSandboxRedirectEmail()) return null;
  return "Set RESEND_SANDBOX_TO to your Resend account email so sandbox delivery succeeds, or verify a domain and update BOOKING_FROM_EMAIL.";
}
