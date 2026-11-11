import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Isolated disposable database on port 3211; never the user's normal app port.
  await page.goto('/');
  await page.evaluate(async () => {
    const { token } = await (await fetch('/api/bootstrap')).json();
    await fetch('/api/data', { method: 'DELETE', headers: { 'X-Hiraya-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
    localStorage.removeItem('hiraya-session');
  });
  await page.reload(); await expect(page.locator('#sessions button')).toHaveCount(1);
});
test('chat, explicit memory approval, persistence, editing and forgetting', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.locator('#message').fill('Remember I like tea'); await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: 'Save this memory' }).click();
  await expect(page.locator('#memory-count')).toHaveText('1');
  await page.reload(); await expect(page.locator('#memory-count')).toHaveText('1');
  await page.locator('#open-memories').click(); await expect(page.locator('#memories-list')).toContainText('I like tea');
  await page.getByRole('button', { name: 'Edit', exact: true }).click(); await page.getByLabel('Edit memory').fill('I like coffee'); await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('#memories-list')).toContainText('I like coffee'); await page.getByRole('button', { name: 'Forget', exact: true }).click(); await expect(page.locator('#memory-count')).toHaveText('0');
  expect(errors).toEqual([]);
});
test('session creation, rename and switch', async ({ page }) => {
  await page.locator('#rename-chat').click(); await page.locator('#session-title').fill('A rainy afternoon'); await page.getByRole('button', { name: 'Save title' }).click();
  await page.locator('#new-chat').click(); await expect(page.locator('#sessions button')).toHaveCount(2);
  await page.getByRole('button', { name: 'A rainy afternoon', exact: true }).click(); await expect(page.locator('#sessions .active')).toContainText('A rainy afternoon');
});
test('preferences persist, memory can be disabled, and plain text cannot inject HTML', async ({ page }) => {
  await page.locator('#open-settings').click(); await page.locator('#language').selectOption('fil'); await page.locator('#memory-enabled').uncheck();
  await page.locator('#settings-dialog .close-dialog').click(); await page.reload(); await page.locator('#open-settings').click();
  await expect(page.locator('#language')).toHaveValue('fil'); await expect(page.locator('#memory-enabled')).not.toBeChecked();
  await page.locator('#settings-dialog .close-dialog').click(); await page.locator('#message').fill('<img src=x onerror=alert(1)>'); await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.message.user')).toContainText('<img src=x onerror=alert(1)>'); await expect(page.locator('.message.user img')).toHaveCount(0);
});
test('mobile layout has no horizontal overflow and essential controls are reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#message')).toBeVisible(); await expect(page.locator('#voice-toggle')).toBeVisible(); await expect(page.locator('#session-picker')).toBeVisible();
  await page.screenshot({ path: '../../artifacts/browser/mobile.png', fullPage: true });
});
