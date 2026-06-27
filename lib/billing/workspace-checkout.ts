import {
  isSelfServePlan,
  normalizePlanSlug,
  pricingPlans,
  type PricingPlanSlug,
} from "@/lib/data/pricing";

export type WorkspaceCheckoutInput = {
  plan: string | null | undefined;
  /** Platform-wide setting from admin billing. Defaults to true. */
  setupFeeEnabled?: boolean;
  setupFeeWaived?: boolean;
  setupFeePaid?: boolean;
  /** Active subscriptions renew at the monthly price only. */
  subscriptionActive?: boolean;
  /** User choice at checkout; ignored when setup is not eligible. */
  includeSetupFee?: boolean;
};

export type WorkspaceCheckoutBreakdown = {
  plan: PricingPlanSlug;
  monthlyPrice: number;
  setupPrice: number;
  setupFeeAmount: number;
  total: number;
  includeSetupFee: boolean;
  setupFeeEligible: boolean;
  setupFeeWaived: boolean;
  setupFeeEnabled: boolean;
};

export function getWorkspaceCheckoutBreakdown(
  input: WorkspaceCheckoutInput
): WorkspaceCheckoutBreakdown {
  const plan = normalizePlanSlug(input.plan);
  const planRecord = pricingPlans.find((entry) => entry.slug === plan);
  const monthlyPrice = planRecord?.monthly_price ?? pricingPlans[0].monthly_price;
  const setupPrice = planRecord?.setup_price ?? 0;

  const setupFeeEnabled = input.setupFeeEnabled !== false;
  const setupFeeEligible =
    setupFeeEnabled &&
    isSelfServePlan(plan) &&
    !input.subscriptionActive &&
    !input.setupFeePaid &&
    !input.setupFeeWaived &&
    setupPrice > 0;

  const includeSetupFee =
    setupFeeEligible && (input.includeSetupFee ?? true);
  const setupFeeAmount = includeSetupFee ? setupPrice : 0;

  return {
    plan,
    monthlyPrice,
    setupPrice,
    setupFeeAmount,
    total: monthlyPrice + setupFeeAmount,
    includeSetupFee,
    setupFeeEligible,
    setupFeeWaived: Boolean(input.setupFeeWaived),
    setupFeeEnabled,
  };
}

export function workspaceCheckoutAmountInKobo(
  input: WorkspaceCheckoutInput
): number {
  const { total } = getWorkspaceCheckoutBreakdown(input);
  return Math.round(total * 100);
}

export function workspaceCheckoutAmountOptionsInKobo(
  input: Omit<WorkspaceCheckoutInput, "includeSetupFee">
): number[] {
  const withSetup = workspaceCheckoutAmountInKobo({
    ...input,
    includeSetupFee: true,
  });
  const withoutSetup = workspaceCheckoutAmountInKobo({
    ...input,
    includeSetupFee: false,
  });

  return withSetup === withoutSetup
    ? [withSetup]
    : [withSetup, withoutSetup];
}

export function parsePaystackIncludeSetupFee(
  value: boolean | string | undefined
): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

export function resolveWorkspaceCheckoutIncludeSetupFee(input: {
  metadataIncludeSetupFee?: boolean | string;
  paidAmountKobo: number;
  checkoutInput: Omit<WorkspaceCheckoutInput, "includeSetupFee">;
}): boolean {
  const parsed = parsePaystackIncludeSetupFee(input.metadataIncludeSetupFee);
  if (parsed != null) return parsed;

  const options = workspaceCheckoutAmountOptionsInKobo(input.checkoutInput);
  if (options.length === 1) {
    return getWorkspaceCheckoutBreakdown({
      ...input.checkoutInput,
      includeSetupFee: true,
    }).includeSetupFee;
  }

  const withoutSetup = workspaceCheckoutAmountInKobo({
    ...input.checkoutInput,
    includeSetupFee: false,
  });
  return input.paidAmountKobo === withoutSetup ? false : true;
}
