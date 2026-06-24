const STORAGE_PREFIX = "faraios.workspace-payment.";

export function rememberWorkspacePaymentReference(
  companyId: string,
  reference: string
) {
  if (!reference) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${companyId}`, reference);
  } catch {
    // ignore
  }
}

export function readWorkspacePaymentReference(companyId: string): string | null {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${companyId}`);
  } catch {
    return null;
  }
}

export function clearWorkspacePaymentReference(companyId: string) {
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${companyId}`);
  } catch {
    // ignore
  }
}
