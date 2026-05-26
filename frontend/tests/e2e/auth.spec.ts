import { test, expect, Page, Browser } from "@playwright/test";

/**
 * Auth E2E tests — critical authentication flows against production.
 * Target: https://my-avatar-smoky.vercel.app
 *
 * Email strategy: timestamp + random suffix so every run creates a
 * fresh account that never collides with prior runs.
 * Password must satisfy: min 8 chars, 1 uppercase, 1 digit.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_PASSWORD = "TestPass1!";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uniqueEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
}

async function fillSignupForm(
  page: Page,
  opts: { name: string; email: string; password: string; confirm?: string }
) {
  await page.getByTestId("signup-name").fill(opts.name);
  await page.getByTestId("signup-email").fill(opts.email);
  await page.getByTestId("signup-password").fill(opts.password);
  await page.getByTestId("signup-confirm").fill(opts.confirm ?? opts.password);
}

async function fillLoginForm(
  page: Page,
  opts: { email: string; password: string }
) {
  await page.getByTestId("login-email").fill(opts.email);
  await page.getByTestId("login-password").fill(opts.password);
}

/**
 * Wait for a Sonner toast containing `text`.
 * Sonner renders toasts inside [data-sonner-toaster].
 */
async function waitForToast(page: Page, text: string | RegExp) {
  const toaster = page.locator("[data-sonner-toaster]");
  await expect(toaster).toContainText(text, { timeout: 15000 });
}

/**
 * Register a brand-new account and return the email used.
 * Asserts landing on /dashboard so the account is confirmed valid.
 */
async function registerFreshAccount(
  browser: Browser,
  name = "Test User"
): Promise<string> {
  const email = uniqueEmail();
  const page = await browser.newPage();
  try {
    await page.goto("/signup");
    await fillSignupForm(page, { name, email, password: TEST_PASSWORD });
    await page.getByRole("button", { name: /create free account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25000 });
  } finally {
    await page.close();
  }
  return email;
}

// ─── Signup tests ─────────────────────────────────────────────────────────────

test.describe("Auth — Signup", () => {
  test("fresh signup with unique email redirects to dashboard", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/signup");
    await fillSignupForm(page, {
      name: "Test User",
      email,
      password: TEST_PASSWORD,
    });
    await page.getByRole("button", { name: /create free account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25000 });
  });

  test("duplicate email signup shows already-registered error toast", async ({
    page,
    browser,
  }) => {
    // Register once — succeeds
    const email = await registerFreshAccount(browser);

    // Attempt second signup with the same email
    await page.context().clearCookies();
    await page.goto("/signup");
    await fillSignupForm(page, {
      name: "Duplicate User",
      email,
      password: TEST_PASSWORD,
    });
    await page.getByRole("button", { name: /create free account/i }).click();

    await waitForToast(page, /already registered/i);
    // Must stay on /signup, not redirect to dashboard
    await expect(page).toHaveURL(/\/signup/);
  });

  test("client-side validation — empty submit shows name error", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: /create free account/i }).click();
    // Zod resolver fires: min 2 chars on name
    await expect(page.getByText(/name must be at least/i)).toBeVisible();
    // Must stay on signup
    await expect(page).toHaveURL(/\/signup/);
  });

  test("client-side validation — mismatched passwords shows confirm error", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("Test User");
    await page.getByTestId("signup-email").fill("valid@example.com");
    await page.getByTestId("signup-password").fill(TEST_PASSWORD);
    await page.getByTestId("signup-confirm").fill("DifferentPass99!");
    await page.getByRole("button", { name: /create free account/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });
});

// ─── Login tests ──────────────────────────────────────────────────────────────

test.describe("Auth — Login", () => {
  let sharedEmail: string;

  test.beforeAll(async ({ browser }) => {
    // Create one account shared across all login tests
    sharedEmail = await registerFreshAccount(browser, "Login Test User");
  });

  test("valid credentials redirect to dashboard", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, { email: sharedEmail, password: TEST_PASSWORD });
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  });

  test("wrong password shows error toast and stays on /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await fillLoginForm(page, {
      email: sharedEmail,
      password: "WrongPass999!",
    });
    await page.getByRole("button", { name: /sign in/i }).click();
    await waitForToast(page, /invalid email or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("non-existent email shows error toast and stays on /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await fillLoginForm(page, {
      email: "does_not_exist_xyz_999@example.com",
      password: TEST_PASSWORD,
    });
    await page.getByRole("button", { name: /sign in/i }).click();
    await waitForToast(page, /invalid email or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("client-side validation — short password shows inline error", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("user@example.com");
    await page.getByTestId("login-password").fill("short");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Zod: min 8 chars
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("forgot password link navigates to /forgot-password", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("sign up free link navigates to /signup", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /sign up free/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

test.describe("Auth — Protected Route Guards", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("unauthenticated /dashboard visit redirects to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("unauthenticated /create visit redirects to /login", async ({
    page,
  }) => {
    await page.goto("/create");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("unauthenticated /projects visit redirects to /login", async ({
    page,
  }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("unauthenticated /settings visit redirects to /login", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("redirect preserves ?from= query param so user returns after login", async ({
    page,
  }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    // The middleware sets ?from=/projects
    const url = new URL(page.url());
    expect(url.searchParams.get("from")).toBe("/projects");
  });
});

// ─── Forgot password flow ─────────────────────────────────────────────────────

test.describe("Auth — Forgot Password", () => {
  test("forgot-password form is visible and shows key elements", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByTestId("forgot-email")).toBeVisible();
    await expect(page.getByTestId("forgot-submit")).toBeVisible();
    await expect(page.getByTestId("back-to-login")).toBeVisible();
  });

  test("back-to-login link navigates back to /login", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByTestId("back-to-login").click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("submitting valid email format shows inbox confirmation (no user enumeration)", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByTestId("forgot-email").fill("nobody_xyz_999@example.com");
    await page.getByTestId("forgot-submit").click();
    // App renders the "Check your inbox" success state regardless of whether
    // the email is registered — prevents user enumeration.
    await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 10000 });
  });
});
