import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:3000";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fillSignup(page: Page, opts: {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}) {
  if (opts.name !== undefined) await page.getByTestId("signup-name").fill(opts.name);
  if (opts.email !== undefined) await page.getByTestId("signup-email").fill(opts.email);
  if (opts.password !== undefined) await page.getByTestId("signup-password").fill(opts.password);
  if (opts.confirm !== undefined) await page.getByTestId("signup-confirm").fill(opts.confirm);
}

async function fillLogin(page: Page, email: string, password: string) {
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
}

// ─── Signup ───────────────────────────────────────────────────────────────────

test.describe("Signup page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/signup`);
  });

  test("renders all form fields", async ({ page }) => {
    await expect(page.getByTestId("signup-name")).toBeVisible();
    await expect(page.getByTestId("signup-email")).toBeVisible();
    await expect(page.getByTestId("signup-password")).toBeVisible();
    await expect(page.getByTestId("signup-confirm")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create free account/i })).toBeVisible();
  });

  test("shows validation error for short name", async ({ page }) => {
    await page.getByRole("button", { name: /Create free account/i }).click();
    await expect(page.getByText(/Name must be at least/i)).toBeVisible();
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await fillSignup(page, { name: "Jane Smith", email: "notanemail", password: "Password1", confirm: "Password1" });
    await page.getByRole("button", { name: /Create free account/i }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test("shows validation error for weak password", async ({ page }) => {
    await fillSignup(page, { name: "Jane Smith", email: "jane@test.com", password: "short", confirm: "short" });
    await page.getByRole("button", { name: /Create free account/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("shows validation error when passwords don't match", async ({ page }) => {
    await fillSignup(page, {
      name: "Jane Smith",
      email: "jane@test.com",
      password: "Password1",
      confirm: "Different1",
    });
    await page.getByRole("button", { name: /Create free account/i }).click();
    await expect(page.getByText(/do not match/i)).toBeVisible();
  });

  test("shows 'already registered' toast with sign-in action when email exists", async ({ page }) => {
    await page.route("**/api/auth/register", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Email already registered" }),
      })
    );
    await fillSignup(page, {
      name: "Jane Smith",
      email: "existing@test.com",
      password: "Password1",
      confirm: "Password1",
    });
    await page.getByRole("button", { name: /Create free account/i }).click();
    await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 8000 });
    // Toast action button
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible({ timeout: 8000 });
  });

  test("'sign in' action in toast navigates to login page", async ({ page }) => {
    await page.route("**/api/auth/register", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Email already registered" }),
      })
    );
    await fillSignup(page, {
      name: "Jane Smith",
      email: "existing@test.com",
      password: "Password1",
      confirm: "Password1",
    });
    await page.getByRole("button", { name: /Create free account/i }).click();
    await page.getByRole("button", { name: /Sign in/i }).first().click({ timeout: 8000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("links to login page", async ({ page }) => {
    await page.getByRole("link", { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("links to terms and privacy pages", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Terms/i })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: /Privacy Policy/i })).toHaveAttribute("href", "/privacy");
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
  });

  test("renders all form fields", async ({ page }) => {
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sign in$/i })).toBeVisible();
  });

  test("shows error toast on invalid credentials", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Incorrect email or password" }),
      })
    );
    await fillLogin(page, "bad@test.com", "wrongpass");
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 8000 });
  });

  test("redirects to dashboard on successful login", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: "fake-jwt-token", token_type: "bearer" }),
      })
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          name: "Test User",
          email: "test@test.com",
          avatar_url: null,
          plan: "free",
          credits: 5,
          created_at: new Date().toISOString(),
        }),
      })
    );
    // Mock all dashboard data APIs so the interceptor doesn't fire 401 redirects
    await page.route("**/api/projects**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, limit: 6 }),
      })
    );
    await fillLogin(page, "test@test.com", "Password1");
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("forgot password link navigates correctly", async ({ page }) => {
    await page.getByRole("link", { name: /Forgot password/i }).click();
    // Dev-mode route compilation can be slow on first visit; use generous timeout
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 15000 });
  });

  test("sign up link navigates correctly", async ({ page }) => {
    await page.getByRole("link", { name: /Sign up free/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

test.describe("Forgot password page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
  });

  test("renders email field and submit button", async ({ page }) => {
    await expect(page.getByTestId("forgot-email")).toBeVisible();
    await expect(page.getByTestId("forgot-submit")).toBeVisible();
  });

  test("submit button is disabled when email is empty", async ({ page }) => {
    await expect(page.getByTestId("forgot-submit")).toBeDisabled();
  });

  test("submit button enables when email is filled", async ({ page }) => {
    await page.getByTestId("forgot-email").fill("user@test.com");
    await expect(page.getByTestId("forgot-submit")).toBeEnabled();
  });

  test("shows success state after submission", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "If that email is registered, a reset link has been sent." }),
      })
    );
    await page.getByTestId("forgot-email").fill("user@test.com");
    await page.getByTestId("forgot-submit").click();
    await expect(page.getByText(/Check your inbox/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/API server console/i)).toBeVisible();
  });

  test("'send to different email' resets the form", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "sent" }),
      })
    );
    await page.getByTestId("forgot-email").fill("user@test.com");
    await page.getByTestId("forgot-submit").click();
    await expect(page.getByText(/Check your inbox/i)).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: /Send to a different email/i }).click();
    await expect(page.getByTestId("forgot-email")).toBeVisible();
    await expect(page.getByTestId("forgot-email")).toHaveValue("");
  });

  test("back to sign in link navigates to login", async ({ page }) => {
    await page.getByTestId("back-to-login").click();
    // Dev-mode route compilation can be slow on first visit; use generous timeout
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});

// ─── Reset Password ───────────────────────────────────────────────────────────

test.describe("Reset password page", () => {
  const validToken = "valid-test-token-abc123";

  const mockValidToken = async (page: Page) => {
    await page.route("**/api/auth/reset-password/validate**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ valid: true }),
      })
    );
  };

  test("shows spinner while validating token", async ({ page }) => {
    let resolve!: () => void;
    const blocker = new Promise<void>((r) => { resolve = r; });
    await page.route("**/api/auth/reset-password/validate**", async (route) => {
      await blocker;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: true }) });
    });
    await page.goto(`${BASE}/reset-password?token=${validToken}`);
    await expect(page.locator(".animate-spin").first()).toBeVisible({ timeout: 3000 });
    resolve();
  });

  test("shows invalid-token UI when token is bad", async ({ page }) => {
    await page.route("**/api/auth/reset-password/validate**", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Token is invalid or expired" }),
      })
    );
    await page.goto(`${BASE}/reset-password?token=bad-token`);
    await expect(page.getByText(/expired or invalid/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("request-new-link")).toBeVisible();
  });

  test("request-new-link navigates to forgot-password", async ({ page }) => {
    await page.route("**/api/auth/reset-password/validate**", (route) =>
      route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ detail: "expired" }) })
    );
    await page.goto(`${BASE}/reset-password?token=bad-token`);
    await page.getByTestId("request-new-link").click({ timeout: 8000 });
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("missing token shows invalid UI immediately", async ({ page }) => {
    await page.goto(`${BASE}/reset-password`);
    await expect(page.getByText(/expired or invalid/i)).toBeVisible({ timeout: 8000 });
  });

  test("renders password form for valid token", async ({ page }) => {
    await mockValidToken(page);
    await page.goto(`${BASE}/reset-password?token=${validToken}`);
    await expect(page.getByTestId("new-password")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("confirm-password")).toBeVisible();
    await expect(page.getByTestId("reset-submit")).toBeVisible();
  });

  test("submit is disabled until all password rules are met", async ({ page }) => {
    await mockValidToken(page);
    await page.goto(`${BASE}/reset-password?token=${validToken}`);
    await expect(page.getByTestId("reset-submit")).toBeDisabled({ timeout: 8000 });
    await page.getByTestId("new-password").fill("weak");
    await expect(page.getByTestId("reset-submit")).toBeDisabled();
  });

  test("all four password rules show ✓ when met", async ({ page }) => {
    await mockValidToken(page);
    await page.goto(`${BASE}/reset-password?token=${validToken}`);
    await expect(page.getByTestId("new-password")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("new-password").fill("Secure1Password");
    await page.getByTestId("confirm-password").fill("Secure1Password");
    await expect(page.getByText("✓")).toHaveCount(4);
  });

  test("shows success state and redirects to login on successful reset", async ({ page }) => {
    await mockValidToken(page);
    await page.route("**/api/auth/reset-password", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Password reset successfully. You can now sign in." }),
      })
    );
    await page.goto(`${BASE}/reset-password?token=${validToken}`);
    await expect(page.getByTestId("new-password")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("new-password").fill("Secure1Password");
    await page.getByTestId("confirm-password").fill("Secure1Password");
    await page.getByTestId("reset-submit").click();
    await expect(page.getByText(/Password updated/i)).toBeVisible({ timeout: 8000 });
    // redirect fires after 2.5s
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test("shows backend error message on failed reset", async ({ page }) => {
    await mockValidToken(page);
    await page.route("**/api/auth/reset-password", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "This reset link is invalid or has expired. Please request a new one." }),
      })
    );
    await page.goto(`${BASE}/reset-password?token=${validToken}`);
    await expect(page.getByTestId("new-password")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("new-password").fill("Secure1Password");
    await page.getByTestId("confirm-password").fill("Secure1Password");
    await page.getByTestId("reset-submit").click();
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible({ timeout: 8000 });
  });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

test.describe("Auth guard", () => {
  test("unauthenticated visit to /dashboard redirects to /login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test("unauthenticated visit to /create redirects to /login", async ({ page }) => {
    await page.goto(`${BASE}/create`);
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test("unauthenticated visit to /projects redirects to /login", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });
});

// ─── Static pages ─────────────────────────────────────────────────────────────

test.describe("Static auth-adjacent pages", () => {
  test("terms page loads with heading and back link", async ({ page }) => {
    await page.goto(`${BASE}/terms`);
    await expect(page.getByRole("heading", { name: /Terms of Service/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to home/i })).toBeVisible();
  });

  test("privacy page loads with heading and back link", async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await expect(page.getByRole("heading", { name: /Privacy Policy/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to home/i })).toBeVisible();
  });
});
