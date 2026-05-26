import { test, expect } from "@playwright/test";

/**
 * Responsive tests — verify login and signup pages render correctly
 * at mobile (375×667) and desktop (1440×900) viewports.
 * Targets: https://my-avatar-smoky.vercel.app
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 667 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Responsive — ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    // ── Login page ─────────────────────────────────────────────────────────

    test("login page: all form elements visible", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByTestId("login-email")).toBeVisible();
      await expect(page.getByTestId("login-password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /welcome back/i })
      ).toBeVisible();
    });

    test("login page: no horizontal overflow", async ({ page }) => {
      await page.goto("/login");

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width ?? vp.width;

      // Body scroll width must not exceed the viewport (no horizontal scrollbar)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for sub-pixel rounding
    });

    // ── Signup page ────────────────────────────────────────────────────────

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

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width ?? vp.width;

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });
  });
}
