import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

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

test('actual Mao rig inventory and bounded performance render with speech mouth priority', async ({ page }) => {
  await page.evaluate(async () => {
    const { MaoAvatar } = await import('/mao-avatar.js');
    const box = document.createElement('div'); box.style.cssText='position:fixed;inset:0;width:600px;height:800px;background:#eff2e9;z-index:9999';document.body.append(box);
    window.inspectedAvatar = new MaoAvatar(box); await window.inspectedAvatar.mount(await(await fetch('/api/avatar')).json());
  });
  const inventory = await page.evaluate(()=>window.inspectedAvatar.parameters);
  mkdirSync('artifacts/browser',{recursive:true});writeFileSync('artifacts/browser/model-parameters.json',JSON.stringify(inventory,null,2));
  expect(inventory.some(p=>p.id==='ParamArmRA01')).toBe(true);expect(inventory.some(p=>p.id==='ParamCheek')).toBe(true);
  await page.evaluate(()=>{window.inspectedAvatar.update({emotion:'warm',cue:{id:'test-wave',emotion:'warm',gesture:'wave',intensity:.5},speaking:true,mouth:.5});});
  await expect.poll(()=>page.evaluate(()=>window.inspectedAvatar.blended.PartArmLB)).toBeGreaterThan(.95);
  await page.screenshot({path:'artifacts/browser/model-wave.png'});
  const mouth=await page.evaluate(()=>{const a=window.inspectedAvatar;a.beforeUpdate();const speaking=a.model.internalModel.coreModel.getParameterValueById('ParamA');a.update({cancel:9,cue:null,speaking:false,mouth:0});a.beforeUpdate();return {speaking,silent:a.model.internalModel.coreModel.getParameterValueById('ParamA'),active:a.performance.active};});
  expect(mouth.speaking).toBeCloseTo(.5);expect(mouth.silent).toBe(0);expect(mouth.active).toBeNull();
  await page.evaluate(()=>window.inspectedAvatar.destroy());
});
