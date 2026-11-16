import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { createFrontier } from '../frontier.js';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('frontier inventory and guest authorization survive retries and full storage', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nks-economy-'));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const databasePath = join(dir, 'test.sqlite');
  let now = 1_900_000_000_000;
  const game = createFrontier({ origin, databasePath, clock: () => now });
  const http = await new Promise(resolve => {
    const server = game.app.listen(port, '127.0.0.1', () => resolve(server));
  });
  try {
    const api = origin + '/api/frontier';
    let cookie;
    const post = (path, body, options = {}) => fetch(api + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie || '', ...options },
      body: JSON.stringify(body)
    });
    const state = async () => (await fetch(api, { headers: { Cookie: cookie } })).json();
    const send = async (action, revision) => post('/command', { action, revision: revision ?? (await state()).revision, site: 'glass-basin' });
    assert.equal((await fetch(api)).status, 204);
    assert.equal((await post('/colony', { name: 'Vale', protagonist: 'male' }, { Origin: 'https://example.com' })).status, 403);
    assert.equal((await post('/colony', { name: ' ', protagonist: 'male' })).status, 400);
    assert.equal((await send('accept', 0)).status, 401);
    const create = await post('/colony', { name: 'Vale', protagonist: 'male' });
    assert.equal(create.status, 201);
    assert.match(create.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    cookie = create.headers.get('set-cookie').split(';')[0];
    assert.equal((await post('/colony', { name: 'Another', protagonist: 'female' })).status, 409);
    assert.equal((await fetch(api)).status, 204);
    assert.equal((await send('dispatch')).status, 409);
    assert.equal((await send('dusk')).status, 409);
    assert.equal((await send('buy-dusk')).status, 409);
    assert.equal((await send('accept')).status, 200);
    const revision = (await state()).revision;
    const dispatches = await Promise.all([send('dispatch', revision), send('dispatch', revision)]);
    assert.deepEqual(dispatches.map(response => response.status).sort(), [200, 409]);
    const dispatch = await dispatches.find(response => response.ok).json();
    now = dispatch.flight.returnsAt;
    assert.equal((await state()).raw, 1000);
    assert.equal((await state()).raw, 1000);
    assert.equal((await send('report')).status, 409);
    assert.equal((await send('refine')).status, 200);
    now += 10_001;
    assert.equal((await state()).refined, 700);
    assert.equal((await send('report')).status, 200);
    assert.equal((await send('dispatch')).status, 200);
    now += 28_001;
    assert.equal((await send('refine')).status, 200);
    now += 10_001;
    const full = await state();
    assert.equal(full.refined, 700);
    assert.equal(full.delivered, 700);
    assert.equal(full.batch.output, 700);
    assert.equal((await send('upgrade', full.revision)).status, 200);
    assert.equal((await send('upgrade', full.revision)).status, 409);
    const upgraded = await state();
    assert.equal(upgraded.refined, 1250);
    assert.equal(upgraded.capacity, 1600);
    assert.equal(upgraded.delivered, 1400);
    assert.equal(upgraded.batch, null);
    assert.equal((await send('dusk')).status, 409);
    assert.equal((await send('buy-dusk', upgraded.revision)).status, 200);
    assert.equal((await send('buy-dusk', upgraded.revision)).status, 409);
    assert.equal((await send('buy-dusk')).status, 409);
    const purchased = await state();
    assert.equal(purchased.ownsDuskwear, true);
    assert.equal(purchased.refined, 1150);
    assert.equal(purchased.outfit, 'field');
    assert.equal((await send('dusk')).status, 200);
    assert.equal((await state()).outfit, 'dusk');
    const check = new DatabaseSync(databasePath);
    try {
      check.exec("UPDATE colonies SET state = json_remove(state, '$.ownsDuskwear')");
      const oldSave = await state();
      assert.equal(oldSave.ownsDuskwear, true);
      assert.equal(oldSave.outfit, 'dusk');
      assert.equal(oldSave.refined, 1150);
      const rows = check.prepare('SELECT kind, raw_delta, refined_delta FROM inventory_events ORDER BY id').all();
      assert.equal(rows.filter(row => row.kind === 'harvester_unloaded').length, 2);
      assert.equal(rows.filter(row => row.kind === 'silo_delivered').length, 2);
      assert.equal(rows.filter(row => row.kind === 'duskwear_purchased').length, 1);
      assert.equal(rows.reduce((total, row) => total + row.refined_delta, 0), purchased.refined);
      assert.equal(rows.reduce((total, row) => total + row.raw_delta, 0), upgraded.raw);
    } finally {
      check.close();
    }
  } finally {
    await new Promise(resolve => {
      http.close(resolve);
      http.closeAllConnections();
    });
    game.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('browser plays The First Reserve without a wallet and keeps its wardrobe after restart', { timeout: 85_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nks-browser-'));
  const databasePath = join(dir, 'game.sqlite');
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const real = process.env.NKS_FRONTIER_REAL_TIME === '1';
  const capture = process.env.NKS_FRONTIER_SCREENSHOTS;
  if (capture) mkdirSync(capture, { recursive: true });
  let now = 1_900_000_000_000;
  let http, game, child, browser;
  async function start() {
    if (!real) {
      game = createFrontier({ origin, databasePath, clock: () => now });
      http = await new Promise(resolve => {
        const server = game.app.listen(port, '127.0.0.1', () => resolve(server));
      });
      return;
    }
    child = spawn(process.execPath, ['frontier.js'], {
      env: { ...process.env, FRONTIER_DATABASE: databasePath, FRONTIER_PORT: String(port), FRONTIER_ORIGIN: origin },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
    });
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => reject(new Error('Frontier process exited during startup: ' + code)));
      child.stdout.on('data', chunk => { if (chunk.toString().includes(origin)) resolve(); });
      child.stderr.on('data', chunk => reject(new Error(chunk.toString())));
    });
  }
  async function stop() {
    if (http) {
      await new Promise(resolve => {
      http.close(resolve);
      http.closeAllConnections();
    });
      game.close();
      http = game = null;
    }
    if (child && child.exitCode === null) {
      const exit = once(child, 'exit');
      child.kill();
      await exit;
      child = null;
    }
  }

  try {
    await start();
    browser = await chromium.launch(process.env.NKS_BROWSER_CHANNEL ? { channel: process.env.NKS_BROWSER_CHANNEL } : {});
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    let page = await context.newPage();
    const errors = [];
    function watch() {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text() + ' ' + message.location().url); });
    }
    watch();
    const button = name => page.getByRole('button', { name, exact: true });
    const screen = name => capture ? page.screenshot({ path: join(capture, name + '.png'), fullPage: true }) : undefined;
    await page.goto(origin);
    await expect(page.getByRole('heading', { name: 'Choose your steward' })).toBeVisible();
    assert.equal(await page.evaluate(() => 'ethereum' in window), false);
    await page.getByRole('radio', { name: 'Female steward' }).check();
    await page.getByLabel('Steward name').fill('Sera');
    await screen('01-protagonist');
    await button('Enter the colony').click();
    await expect(page.getByRole('dialog')).toContainText('Welcome to Emberwell, Sera');
    await screen('02-briefing');
    await button('Continue').click();
    await button('Continue').click();
    await button('Accept mission').click();
    await expect(page.getByRole('heading', { name: 'Emberwell' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await screen('03-colony');
    await button('Market').click();
    await button('Open market').click();
    await expect(page.locator('#outfit-preview')).toHaveAttribute('src', /female-dusk/);
    await expect(button('Buy Duskwear')).toBeDisabled();
    await button('Close').click();
    const canvas = await page.locator('canvas').boundingBox();
    assert.ok(canvas);
    await page.locator('canvas').click({ position: { x: canvas.width * 151 / 480, y: canvas.height * 125 / 270 } });
    await expect(page.locator('#panel-title')).toHaveText('Hangar');
    await button('Open desert map').click();
    const startTime = Date.now();
    await button('Dispatch harvester').click();
    await expect(page.locator('#panel-detail')).toContainText('outbound');
    await screen('04-expedition');
    await page.close();
    console.log('Dispatched H-01 and closed the browser page.');
    await stop();
    console.log('Stopped server with the expedition saved.');
    if (real) await delay(28_100);
    else now += 28_100;
    await start();
    page = await context.newPage();
    watch();
    await page.goto(origin);
    await expect(page.locator('#operator-name')).toHaveText('Sera');
    await expect(page.locator('#raw')).toHaveText('1,000');
    await button('Refinery').click();
    await button('Start refining').click();
    await expect(page.locator('#panel-detail')).toContainText('Refining');
    await screen('05-refinery');
    if (!real) now += 10_100;
    await expect(page.locator('#refined')).toHaveText('700 / 900', { timeout: 16_000 });
    await expect(page.locator('#objective')).toHaveText('500 / 500');
    await button('Inspect silo').click();
    await screen('06-delivery');
    await button('Return to Command').click();
    await button('Report to Commander Iona').click();
    await button('Continue').click();
    await button('Complete mission').click();
    await button('Silo').click();
    await button('Expand silo').click();
    await expect(page.locator('#refined')).toHaveText('550 / 1,600');
    await expect(page.locator('#silo-level')).toHaveText('2');
    await button('Market').click();
    await button('Open market').click();
    await expect(page.locator('#shop-detail')).toContainText('100 REFINED SPICE');
    await screen('07-market');
    await button('Buy Duskwear').click();
    await expect(page.locator('#market-feedback')).toHaveText('Duskwear added to your wardrobe.');
    await button('Wardrobe').click();
    await expect(button('Field uniform')).toHaveAttribute('aria-pressed', 'true');
    await button('Duskwear').click();
    await expect(button('Duskwear')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#outfit-preview')).toHaveAttribute('src', /female-dusk/);
    await screen('08-wardrobe');
    await button('Close').click();
    await page.reload();
    await expect(page.locator('#avatar')).toHaveAttribute('src', /female-dusk/);
    await expect(page.locator('#refined')).toHaveText('450 / 1,600');
    await expect(page.locator('#objective')).toHaveText('500 / 500');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    await screen('09-mobile');
    assert.deepEqual(errors, []);
    console.log(`Frontier mission delivered 700, spent 150 on storage and 100 on Duskwear, retained 450 and saved the outfit. ${real ? 'CLI and real timers' : 'isolated clock'} (${Math.round((Date.now() - startTime) / 1000)} wall seconds).`);
  } finally {
    await browser?.close();
    await stop();
    rmSync(dir, { recursive: true, force: true });
  }
});
