import { test, expect, Page } from "@playwright/test";

/**
 * Smoke tests — every page (public and auth-gated) loads without critical errors.
 * Auth-gated pages are tested for their redirect behaviour when unauthenticated.
 * Target: https://my-avatar-smoky.vercel.app
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Collect console errors, then filter out known-benign noise.
 */
function collectConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return () =>
    errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("extension") &&
        !e.includes("ResizeObserver") &&
        !e.includes("net::ERR_ABORTED") // preload cancellations on navigation
    );
}

/**
 * skipIfNotAuth — if the page redirected to /login, skip the test gracefully.
 * Use this for any assertion that requires an authenticated session.
 */
async function skipIfNotAuth(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes("/login")) {
    test.skip(true, "Page requires auth — redirect to /login confirmed, skipping interior assertions");
    return true;
  }
  return false;
}

// ─── Public pages ────────────────────────────────────────────────────────────

test.describe("Smoke — Public Pages", () => {
  test("/ homepage loads with landing content and no console errors", async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\//);
    await expect(page.locator("main")).toBeVisible();
    // Title includes branding
    await expect(page).toHaveTitle(/my avatar/i);
    expect(getErrors()).toHaveLength(0);
  });

  test("/login shows sign-in form and no console errors", async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    expect(getErrors()).toHaveLength(0);
  });

  test("/signup shows registration form and no console errors", async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByTestId("signup-name")).toBeVisible();
    await expect(page.getByTestId("signup-email")).toBeVisible();
    await expect(page.getByTestId("signup-password")).toBeVisible();
    await expect(page.getByTestId("signup-confirm")).toBeVisible();
    await expect(page.getByRole("button", { name: /create free account/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    expect(getErrors()).toHaveLength(0);
  });

  test("/forgot-password shows email form and no console errors", async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/\/forgot-password/);
    // The page renders the forgot-password form
    await expect(page.getByTestId("forgot-email")).toBeVisible();
    await expect(page.getByTestId("forgot-submit")).toBeVisible();
    expect(getErrors()).toHaveLength(0);
  });

  test("/terms loads static content and no console errors", async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await page.goto("/terms");
    await expect(page).toHaveURL(/\/terms/);
    await expect(page.locator("body")).toBeVisible();
    expect(getErrors()).toHaveLength(0);
  });

  test("/privacy loads static content and no console errors", async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await page.goto("/privacy");
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.locator("body")).toBeVisible();
    expect(getErrors()).toHaveLength(0);
  });
});

// ─── Auth-gated pages (unauthenticated) ──────────────────────────────────────

test.describe("Smoke — Auth-gated Pages (unauthenticated redirect)", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean unauthenticated state
    await page.context().clearCookies();
  });

  test("/dashboard redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    // Login form must render (not a blank page)
    await expect(page.getByTestId("login-email")).toBeVisible();
  });

  test("/create redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.goto("/create");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByTestId("login-email")).toBeVisible();
  });

  test("/projects redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByTestId("login-email")).toBeVisible();
  });

  test("/settings redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByTestId("login-email")).toBeVisible();
  });
});
