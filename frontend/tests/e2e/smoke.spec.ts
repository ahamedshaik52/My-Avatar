import { test, expect } from "@playwright/test";

/**
 * Smoke tests — every public page loads without critical errors.
 * These tests run against the live production deployment.
 */

test.describe("Smoke — Public Pages", () => {
  test("homepage loads and shows landing content", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    // The page is a landing page — not a redirect
    await expect(page).toHaveURL(/\//);
    // Landing nav or hero should be visible
    await expect(page.locator("main")).toBeVisible();

    // Filter out known benign browser errors (e.g. extension noise)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("extension") &&
        !e.includes("ResizeObserver")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("/login shows the sign-in form", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    // Key form elements present
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    // Heading
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("extension") &&
        !e.includes("ResizeObserver")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("/signup shows the registration form", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);

    // All four signup fields visible
    await expect(page.getByTestId("signup-name")).toBeVisible();
    await expect(page.getByTestId("signup-email")).toBeVisible();
    await expect(page.getByTestId("signup-password")).toBeVisible();
    await expect(page.getByTestId("signup-confirm")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create free account/i })
    ).toBeVisible();

    // Heading
    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("extension") &&
        !e.includes("ResizeObserver")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
