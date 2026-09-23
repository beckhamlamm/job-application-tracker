// Exercises storage migration, React interactions, CSV downloads, and parser failures in a fresh browser.
import { test, expect } from '@playwright/test';
const storageKey = 'applyboard.applications.v1';
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});
const applications = [
  {
    id: 'alpha',
    company: 'Alpha',
    role: 'Engineer',
    url: 'https://example.org/jobs/1',
    datePosted: '2026-01-01',
    dateApplied: '2026-01-02',
    status: 'Applied',
    createdAt: 1,
  },
  {
    id: 'beta',
    company: 'Beta',
    role: 'Designer',
    url: '',
    datePosted: '',
    dateApplied: '2026-01-03',
    status: 'OA',
    createdAt: 2,
  },
];
test('status information shows all nonzero counts in priority order and ignores search filters', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, item }) => {
      localStorage.setItem(
        key,
        JSON.stringify(
          ['Withdrawn', 'Applied', 'OA', 'Interviewing', 'Rejected', 'Offer', 'Applied'].map(
            (status, index) => ({ ...item, id: String(index), status }),
          ),
        ),
      );
    },
    { key: storageKey, item: applications[0] },
  );
  await page.goto('/');
  await page.getByLabel('Search applications').fill('no matching company');
  const info = page.getByRole('button', { name: 'Application status counts' });
  await info.focus();
  await expect(page.getByRole('tooltip').locator('span')).toHaveText([
    '1 offer application',
    '1 interviewing application',
    '1 OA application',
    '2 active applications',
    '1 rejected application',
    '1 withdrawn application',
  ]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await info.click();
  await expect(page.getByRole('tooltip')).toBeVisible();
});

test('saved applications survive editing, starring, sorting, and reload', async ({ page }) => {
  await page.addInitScript(
    ({ key, items }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(items));
      }
    },
    { key: storageKey, items: applications },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Application status counts' }).hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(page.getByRole('tooltip').locator('span')).toHaveText([
    '1 OA application',
    '1 active application',
  ]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await expect(page.locator('tbody tr').first()).toContainText('Beta');
  await page.getByRole('button', { name: 'Star Alpha application', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Alpha');
  await page.getByRole('button', { name: 'Edit Alpha application' }).click();
  await page.getByLabel('Company', { exact: true }).fill('Alpha Labs');
  await page.getByLabel('Status', { exact: true }).selectOption('OA');
  await page.getByRole('button', { name: 'Save application' }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Remove star from Alpha Labs application' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Remove star from Alpha Labs application' }).click();
  await page.mouse.move(0, 0);
  await expect(
    page.getByRole('button', { name: 'Star Alpha Labs application', exact: true }),
  ).toHaveCSS('opacity', '0');
  await page.getByLabel('Sort applications').selectOption('company');
  await expect(page.locator('tbody tr').first()).toContainText('Alpha Labs');
  await page.getByLabel('Search applications').fill('Beta');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await downloadEvent).suggestedFilename()).toMatch(/^ApplyBoard-\d{2}-\d{2}-\d{4}\.csv$/);
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Beta application' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.getByLabel('Search applications').fill('');
  await expect(page.locator('tbody tr')).toHaveCount(1);
});
test('parse failures open manual entry and new records persist', async ({ page }) => {
  await page.route('**/api/parse', (route) =>
    route.fulfill({ status: 400, json: { error: 'Page unavailable' } }),
  );
  await page.goto('/');
  await page.getByLabel('Job posting URL to parse').fill('https://example.org/job');
  await page.getByRole('button', { name: 'Track application' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Company', { exact: true }).fill('Example');
  await page.getByLabel('Role', { exact: true }).fill('Developer');
  await page.getByRole('button', { name: 'Save application' }).click();
  await page.reload();
  await expect(page.locator('tbody tr')).toContainText('Example');
});
test('invalid saved data remains untouched with editing disabled', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'broken json'), storageKey);
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'left untouched' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add manually' })).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe('broken json');
});
test('real route rejects malformed, private, and oversized input', async ({ request }) => {
  for (const body of [{}, { url: 'http://localhost/job' }, { url: 'not a url' }]) {
    const response = await request.post('/api/parse', { data: body });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBeTruthy();
  }
  const oversized = await request.post('/api/parse', { data: { url: 'x'.repeat(1_000_001) } });
  expect(oversized.status()).toBe(413);
});

test('parsed details can be reviewed and saved on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/parse', (route) =>
    route.fulfill({
      json: {
        url: 'https://example.org/job',
        company: 'Example Labs',
        role: 'Software Engineer',
        datePosted: '2026-01-01',
      },
    }),
  );
  await page.goto('/');
  await page.getByLabel('Job posting URL to parse').fill('https://example.org/job');
  await page.getByRole('button', { name: 'Track application' }).click();
  await expect(page.getByLabel('Company', { exact: true })).toHaveValue('Example Labs');
  await expect(page.getByLabel('Role', { exact: true })).toHaveValue('Software Engineer');
  await expect(page.getByLabel('Date posted', { exact: true })).toHaveValue('2026-01-01');
  await page.getByRole('button', { name: 'Save application' }).click();
  await expect(page.locator('tbody tr')).toContainText('Example Labs');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('button', { name: 'Add manually' })).toHaveCSS('font-size', '16px');
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
});
