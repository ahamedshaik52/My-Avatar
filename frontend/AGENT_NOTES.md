# AGENT_NOTES — My Avatar E2E QA Run (iter-2)

## Phase 0 — Discovery

### Stack
- Framework: Next.js 14.2.5 (App Router)
- Language: TypeScript (strict mode)
- State: Zustand (`useAuthStore`, `useCreateVideoStore`)
- Auth: JWT in `access_token` cookie; server-side guard via Next.js middleware
- HTTP: Axios with Bearer interceptor
- Forms: react-hook-form + Zod
- Toast: Sonner (`[data-sonner-toaster]`)
- Package manager: npm

### Pages Discovered
- `/` — Landing page (LandingHero, LandingFeatures, LandingHowItWorks, LandingPricing, LandingTestimonials, LandingCTA, LandingFooter)
- `/(auth)/login` — Sign-in form
- `/(auth)/signup` — Registration form
- `/(auth)/forgot-password` — Forgot password form (shows "Check your inbox" success state)
- `/(auth)/reset-password` — Reset password form (token-gated)
- `/(dashboard)/dashboard` — Main dashboard (protected)
- `/(dashboard)/create` — 4-step video creation wizard (protected): Avatar → Script → Voice → Generate
- `/(dashboard)/projects` — Project list (protected)
- `/(dashboard)/settings` — User settings (protected) with tabs: Profile, Billing, Notifications, Security
- `/terms`, `/privacy` — Static legal pages

### Auth Guard (middleware.ts)
- Protected prefixes: `/dashboard`, `/create`, `/projects`, `/settings`
- Public paths: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy`
- Redirects to `/login?from=<pathname>` when `access_token` cookie is absent
- Verified: `?from=` query param is preserved for post-login redirect

### data-testid Attributes Found
- Login: `login-email`, `login-password`
- Signup: `signup-name`, `signup-email`, `signup-password`, `signup-confirm`
- Forgot password: `forgot-email`, `forgot-submit`, `back-to-login`
- Reset password: `new-password`, `confirm-password`, `reset-submit`, `request-new-link`

### Create Wizard Store
- Persisted in `sessionStorage` (not `localStorage`) via custom Zustand middleware
- `step` is a number 1–4 driven by `setStep()`
- The "Continue" button on Step 1 is disabled until `avatar !== null && title.trim().length > 0`
- Step 2 → 3 transition requires `script.trim().length > 20`
- Step 3 → 4 calls `voiceApi.generate()` and requires an authenticated `projectId`

## Phase 1 — Playwright Setup

- `@playwright/test` already present at ^1.45.3 (devDependencies)
- Chromium browser already installed
- `playwright.config.ts` in place:
  - `baseURL`: `https://my-avatar-smoky.vercel.app`
  - No `webServer` block (testing live production)
  - `workers: 1` (prevents parallel account-creation race conditions)
  - `reporter: [["list"], ["html", { open: "never" }]]`
  - `retries: 1` locally, `2` in CI

## Phase 2 — Test Expansion (iter-2)

### Changes from iter-1

| File | iter-1 tests | iter-2 tests | What changed |
|------|-------------|-------------|-------------|
| `smoke.spec.ts` | 3 | 10 | Added `/forgot-password`, `/terms`, `/privacy`, all 4 auth-gated pages |
| `auth.spec.ts` | 8 | 18 | Added client-side validation tests, forgot-password flow, `?from=` param, cross-page nav links |
| `create-video.spec.ts` | 8 | 18 | Added settings/projects/create wizard structure (skipIfNotAuth), CTA button, more landing tests |
| `responsive.spec.ts` | 8 | 39 | Added tablet 768×1024, homepage, forgot-password, terms, privacy, all auth-gated pages at all 3 viewports |

### skipIfNotAuth Pattern
Auth-gated interior tests (`/create`, `/projects`, `/settings`) use a `skipIfNotAuth()` helper that:
1. Navigates to the protected page
2. Checks if the current URL contains `/login`
3. If redirected → calls `test.skip(true, reason)` and returns `true`
4. If not redirected (auth cookie present in future CI) → runs full assertions

This allows the tests to document what the page should look like and provide coverage when a real auth cookie is injected, without blocking the unauthenticated CI run.

## Phase 3 — Test Run Results

### Run 1 (iter-2)
- 80 passed / 9 skipped / 0 failed
- Duration: ~2.7 minutes
- Skipped: wizard interior, projects interior, settings interior (all require auth)

### Run 2 (flakiness check)
- 80 passed / 9 skipped / 0 failed
- Duration: ~3.1 minutes
- Zero flaky tests

## Known Limitations / Out of Scope

1. `/(auth)/reset-password` — requires a valid reset token from email, not automatable without email interception tooling
2. Dashboard interior flows — require authenticated sessions (Zustand + cookie)
3. `/create` wizard interior steps (Steps 2–4) — require auth + completed prior steps
4. Voice preview playback — requires API + audio support
5. Video generation — long-running job, requires auth + all prior steps completed
6. Cross-browser testing (webkit/firefox) — chromium only per config
7. No performance timing assertions
