import { test, expect, Page, Browser } from "@playwright/test";

/**
 * Auth E2E tests — critical authentication flows against production.
 * Targets: https://my-avatar-smoky.vercel.app
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
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

test.describe("Auth — Protected Route Guards", () => {
  test("unauthenticated /dashboard visit redirects to /login", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("unauthenticated /create visit redirects to /login", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/create");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("unauthenticated /projects visit redirects to /login", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
