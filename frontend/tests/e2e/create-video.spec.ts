import { test, expect } from "@playwright/test";

/**
 * create-video.spec.ts — Landing page content and public UI tests.
 * Targets: https://my-avatar-smoky.vercel.app
 * These tests use no mocking — all assertions are against the live deployment.
 */

test.describe("Landing page — branding and content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page title includes My Avatar", async ({ page }) => {
    await expect(page).toHaveTitle(/my avatar/i);
  });

  test("navigation shows Sign in and Start free links", async ({ page }) => {
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /start free/i }).first()).toBeVisible();
  });

  test("pricing section shows Free and Pro plans", async ({ page }) => {
    // Scroll to pricing section
    const pricingSection = page.getByText("Free").first();
    await pricingSection.scrollIntoViewIfNeeded();
    await expect(page.getByText("Free").first()).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible();
  });

  test("how it works section shows avatar upload step", async ({ page }) => {
    const step = page.getByText(/upload.*avatar/i).first();
    await step.scrollIntoViewIfNeeded();
    await expect(step).toBeVisible();
  });
});

test.describe("Login page — form elements", () => {
  test("shows email and password inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••").first()).toBeVisible();
  });
});

test.describe("Signup form — client-side validation", () => {
  test("shows name validation error when submitted empty", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: /create free account/i }).click();
    await expect(page.getByText(/name must be at least/i)).toBeVisible();
  });
});

test.describe("Auth guard — protected routes", () => {
  test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("unauthenticated /create redirects to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/create");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
