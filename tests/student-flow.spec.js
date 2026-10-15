/**
 * Student portal smoke test.
 *
 * What this checks:
 *   1. Login as a student (handles both the "clock-in" branch and the
 *      direct-redirect branch in js/login-logic.js)
 *   2. /student/grades.html actually loads real data from the gradebook
 *      API (not stuck on "Connecting to Gradebook...")
 *   3. /student/files.html and /student/notes.html load without the
 *      auth-guard bouncing you back to login
 *   4. Logout actually clears the session (localStorage) and protected
 *      pages redirect back to login afterward
 *
 * Every console error and failed network request is collected and printed,
 * so this doubles as a quick way to see whether the "known gaps" API routes
 * are actually wired up yet.
 *
 * SETUP
 * -----
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * RUN
 * ---
 *   Set your test student's credentials as environment variables so they
 *   never live in this file or get typed by anyone but you:
 *
 *     TEST_BASE_URL=http://localhost:3000 \
 *     TEST_STUDENT_USERNAME=coder99 \
 *     TEST_STUDENT_PASSWORD='whatever-it-is' \
 *     npx playwright test tests/student-flow.spec.js
 *
 *   (On Windows/PowerShell, set them with $env:TEST_STUDENT_USERNAME="...", etc.)
 *
 * Nothing here hardcodes or logs the password. If TEST_STUDENT_USERNAME or
 * TEST_STUDENT_PASSWORD isn't set, the whole file is skipped with a clear
 * message instead of failing.
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const USERNAME = process.env.TEST_STUDENT_USERNAME;
const PASSWORD = process.env.TEST_STUDENT_PASSWORD;

test.skip(
  !USERNAME || !PASSWORD,
  'Set TEST_STUDENT_USERNAME and TEST_STUDENT_PASSWORD env vars to run the student flow test.'
);

/** Attach console/network listeners and return the arrays they fill. */
function watchPage(page) {
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`Uncaught: ${err.message}`));
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  return { consoleErrors, failedRequests };
}

async function login(page) {
  const { consoleErrors, failedRequests } = watchPage(page);

  // Auto-handle the forced password-change flow (native prompt/alert) if it
  // ever fires for this test account, so the test doesn't hang forever.
  // If you see this in the output, give the test account a password that
  // doesn't have must_change_password set instead of relying on this.
  page.on('dialog', async (dialog) => {
    console.warn(`[dialog] "${dialog.message()}" — dismissing (test account may need must_change_password=0)`);
    await dialog.dismiss();
  });

  await page.goto(`${BASE_URL}/login.html`);
  await page.fill('#login-username', USERNAME);
  await page.fill('#login-password', PASSWORD);
  await page.click('#login-form button[type="submit"]');

  // Surface a bad-credentials error immediately instead of timing out later.
  const authError = page.locator('#auth-error');
  if (await authError.isVisible({ timeout: 3000 }).catch(() => false)) {
    const msg = await authError.textContent();
    throw new Error(`Login rejected: ${msg}`);
  }

  // Regular-shift accounts get shown a clock-in question before redirecting.
  const clockinAnswer = page.locator('#clockin-answer');
  if (await clockinAnswer.isVisible({ timeout: 4000 }).catch(() => false)) {
    await clockinAnswer.fill('Automated test run - smoke testing student portal.');
    await page.click('#clockin-form button[type="submit"]');
  }

  await page.waitForURL('**/student/grades.html', { timeout: 10000 });
  return { consoleErrors, failedRequests };
}

test.describe('Student portal', () => {
  test('logs in and lands on the grades page', async ({ page }) => {
    const { consoleErrors, failedRequests } = await login(page);
    expect(page.url()).toContain('/student/grades.html');
    if (failedRequests.length) {
      console.log('Failed requests during login:\n' + failedRequests.join('\n'));
    }
  });

  test('grades page loads real data from the gradebook API', async ({ page }) => {
    const { consoleErrors, failedRequests } = await login(page);

    // "Connecting to Gradebook..." is the placeholder text - it should be
    // replaced once /api/student/grades responds.
    const subtitle = page.locator('#userSubtitle');
    await expect(subtitle).not.toHaveText('Connecting to Gradebook...', { timeout: 10000 });

    const overallPercent = page.locator('#overallPercent');
    await expect(overallPercent).not.toHaveText('--%', { timeout: 10000 });

    const rows = page.locator('#gradeBody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    console.log(`Grade rows found: ${await rows.count()}`);
    if (consoleErrors.length) {
      console.log('Console errors on grades page:\n' + consoleErrors.join('\n'));
    }
    if (failedRequests.length) {
      console.log('Failed requests on grades page:\n' + failedRequests.join('\n'));
    }
    expect(consoleErrors, 'No JS console errors on the grades page').toEqual([]);
  });

  test('files and notes pages load without bouncing to login', async ({ page }) => {
    await login(page);
    const { consoleErrors, failedRequests } = watchPage(page);

    await page.goto(`${BASE_URL}/student/files.html`);
    await expect(page).not.toHaveURL(/login\.html/);

    await page.goto(`${BASE_URL}/student/notes.html`);
    await expect(page).not.toHaveURL(/login\.html/);

    if (consoleErrors.length) {
      console.log('Console errors on files/notes pages:\n' + consoleErrors.join('\n'));
    }
    if (failedRequests.length) {
      console.log('Failed requests on files/notes pages:\n' + failedRequests.join('\n'));
    }
  });

  test('logout clears the session and protected pages redirect to login', async ({ page }) => {
    await login(page);

    await page.goto(`${BASE_URL}/logout.html`);
    await page.waitForURL('**/index.html', { timeout: 5000 });

    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeNull();

    await page.goto(`${BASE_URL}/student/grades.html`);
    await expect(page).toHaveURL(/login\.html/, { timeout: 5000 });
  });
});
