import { test, expect } from "@playwright/test";

/**
 * Responsive tests — verify pages render correctly at 3 viewports:
 *   - mobile:  375×667  (iPhone SE)
 *   - tablet:  768×1024 (iPad)
 *   - desktop: 1440×900 (13" laptop)
 *
 * Auth-gated pages (/dashboard, /create, /projects, /settings) are tested
 * for redirect behaviour only — no auth cookie is injected.
 *
 * Target: https://my-avatar-smoky.vercel.app
 */

const VIEWPORTS = [
  { name: "mobile",  width: 375,  height: 667  },
  { name: "tablet",  width: 768,  height: 1024 },
  { name: "desktop", width: 1440, height: 900  },
] as const;

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Assert no horizontal scroll on the current page.
 * Allows 1px tolerance for sub-pixel rounding.
 */
async function assertNoHorizontalOverflow(
  page: import("@playwright/test").Page,
  viewportWidth: number
): Promise<void> {
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyScrollWidth, "Horizontal overflow detected").toBeLessThanOrEqual(
    viewportWidth + 1
  );
}

// ─── Tests per viewport ───────────────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test.describe(`Responsive — ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    // ── Homepage ──────────────────────────────────────────────────────────────

    test("/ homepage: renders main content without overflow", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("main")).toBeVisible();
      await assertNoHorizontalOverflow(page, vp.width);
    });

    test("/ homepage: title is set", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/my avatar/i);
    });

    // ── Login page ────────────────────────────────────────────────────────────

    test("login page: all form elements visible", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByTestId("login-email")).toBeVisible();
      await expect(page.getByTestId("login-password")).toBeVisible();
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    });

    test("login page: no horizontal overflow", async ({ page }) => {
      await page.goto("/login");
      await assertNoHorizontalOverflow(page, vp.width);
    });

    // ── Signup page ───────────────────────────────────────────────────────────

    test("signup page: all form elements visible", async ({ page }) => {
      await page.goto("/signup");
      await expect(page.getByTestId("signup-name")).toBeVisible();
      await expect(page.getByTestId("signup-email")).toBeVisible();
      await expect(page.getByTestId("signup-password")).toBeVisible();
      await expect(page.getByTestId("signup-confirm")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /create free account/i })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /create your account/i })
      ).toBeVisible();
    });

    test("signup page: no horizontal overflow", async ({ page }) => {
      await page.goto("/signup");
      await assertNoHorizontalOverflow(page, vp.width);
    });

    // ── Forgot password page ──────────────────────────────────────────────────

    test("forgot-password page: form is visible and not overflowing", async ({
      page,
    }) => {
      await page.goto("/forgot-password");
      await expect(page.getByTestId("forgot-email")).toBeVisible();
      await expect(page.getByTestId("forgot-submit")).toBeVisible();
      await assertNoHorizontalOverflow(page, vp.width);
    });

    // ── Terms / Privacy (static) ──────────────────────────────────────────────

    test("terms page: renders without overflow", async ({ page }) => {
      await page.goto("/terms");
      await expect(page.locator("body")).toBeVisible();
      await assertNoHorizontalOverflow(page, vp.width);
    });

    test("privacy page: renders without overflow", async ({ page }) => {
      await page.goto("/privacy");
      await expect(page.locator("body")).toBeVisible();
      await assertNoHorizontalOverflow(page, vp.width);
    });

    // ── Auth-gated pages — redirect + login form visible ──────────────────────

    test("/dashboard: redirects to /login (login form visible)", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      // Login form should still render correctly at this viewport
      await expect(page.getByTestId("login-email")).toBeVisible();
      await assertNoHorizontalOverflow(page, vp.width);
    });

    test("/create: redirects to /login (login form visible)", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await page.goto("/create");
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      await expect(page.getByTestId("login-email")).toBeVisible();
      await assertNoHorizontalOverflow(page, vp.width);
    });

    test("/projects: redirects to /login (login form visible)", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await page.goto("/projects");
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      await expect(page.getByTestId("login-email")).toBeVisible();
      await assertNoHorizontalOverflow(page, vp.width);
    });

    test("/settings: redirects to /login (login form visible)", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await page.goto("/settings");
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      await expect(page.getByTestId("login-email")).toBeVisible();
      await assertNoHorizontalOverflow(page, vp.width);
    });
  });
}
