import { confirmWorkspacePaymentFromReference } from "@/lib/billing/workspace-subscription-payment";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";

export type PaymentConfirmationState =
  | { status: "none" }
  | { status: "activated" }
  | { status: "already_active" }
  | { status: "pending_webhook" }
  | { status: "failed"; error: string };

export async function confirmWorkspacePaymentForUser(input: {
  reference: string | null | undefined;
  companyId: string;
  companySlug: string;
  userId: string;
  paymentSuccess?: boolean;
}): Promise<PaymentConfirmationState> {
  if (!input.paymentSuccess) {
    return { status: "none" };
  }

  const reference = input.reference?.trim();
  if (!reference) {
    return { status: "pending_webhook" };
  }

  const hasAccess = await userHasCompanySlugAccess(input.userId, input.companySlug);
  if (!hasAccess) {
    return { status: "failed", error: "You do not have access to this workspace." };
  }

  const result = await confirmWorkspacePaymentFromReference({
    reference,
    companyId: input.companyId,
  });

  if (!result.ok) {
    return { status: "failed", error: result.error };
  }

  if (result.alreadyActive) {
    return { status: "already_active" };
  }

  return { status: "activated" };
}
