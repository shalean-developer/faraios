import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke tests for the core customer journey.
 *
 * Requires:
 * - Running app (Playwright starts `npm run dev` unless PLAYWRIGHT_SKIP_WEBSERVER=1)
 * - Optional authenticated flow: set E2E_USER_EMAIL and E2E_USER_PASSWORD
 * - Optional workspace slug: E2E_COMPANY_SLUG (defaults to first dashboard link after login)
 *
 * Without credentials, public marketing and auth page smoke tests still run.
 */

test.describe("Public marketing", () => {
  test("homepage loads with signup CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /get started|start your workspace/i }).first()).toBeVisible();
  });

  test("platform about and contact pages load", async ({ page }) => {
    await page.goto("/platform/about");
    await expect(page.getByRole("heading", { name: /business operating system/i })).toBeVisible();

    await page.goto("/platform/contact");
    await expect(page.getByRole("heading", { name: /contact shalean/i })).toBeVisible();
  });

  test("main-host about redirects to platform about", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveURL(/\/platform\/about/);
  });
});

test.describe("Authentication pages", () => {
  test("sign-up and sign-in forms render", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByLabel(/email/i)).toBeVisible();

    await page.goto("/auth/sign-in");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe("Authenticated workspace journey", () => {
  test.skip(
    !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run authenticated E2E"
  );

  test("signup → dashboard → bookings → invoices navigation", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;

    await page.goto("/auth/sign-in");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/\/(app|onboarding|dashboard|admin)/, { timeout: 30_000 });

    if (page.url().includes("/onboarding")) {
      test.skip(true, "User has no workspace — complete onboarding manually first");
    }

    const slug = process.env.E2E_COMPANY_SLUG;
    if (slug) {
      await page.goto(`/${slug}/dashboard`);
    } else if (page.url().includes("/app")) {
      await page.goto("/app");
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    }

    await expect(page.getByRole("heading", { name: /overview|dashboard|bookings/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    const dashboardUrl = page.url();
    const companySlug = slug ?? dashboardUrl.match(/\/([^/]+)\/dashboard/)?.[1];
    expect(companySlug).toBeTruthy();

    await page.goto(`/${companySlug}/dashboard/bookings`);
    await expect(page.getByRole("heading", { name: /bookings/i })).toBeVisible();

    await page.goto(`/${companySlug}/dashboard/customers`);
    await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible();

    await page.goto(`/${companySlug}/dashboard/invoices`);
    await expect(page.getByRole("heading", { name: /invoices/i })).toBeVisible();

    await page.goto(`/${companySlug}/dashboard/leads`);
    await expect(page.getByRole("heading", { name: /leads/i })).toBeVisible();
  });
});
