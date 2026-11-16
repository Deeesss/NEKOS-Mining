import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { Contract, Wallet, getBytes, parseEther } from 'ethers';
import { createGame } from '../server.js';
import { readConfig } from '../lib/config.js';
import { REWARDS_ABI, TOKEN_ABI, claimDomain, claimTypes } from '../lib/chain.js';
import { fundedWallet, startDevChain } from '../scripts/dev-chain.mjs';
import { deploy } from '../scripts/deployment.mjs';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('NEKOS browser flow, persistent ledger and on-chain claim rules', { timeout: 90_000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'nks-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const node = await startDevChain(await freePort());
  const player = await fundedWallet(node.provider);
  const other = await fundedWallet(node.provider);
  const signer = Wallet.createRandom();
  const deployer = await fundedWallet(node.provider);
  let http, game, browser;
  async function stopGame() {
    if (!http) return;
    await new Promise(resolve => http.close(resolve));
    game.close();
    http = null;
  }
  try {
    const addresses = await deploy(deployer, signer.address);
    const token = new Contract(addresses.token, TOKEN_ABI, node.provider);
    const distributor = new Contract(addresses.rewards, REWARDS_ABI, node.provider);
    assert.equal(await token.balanceOf(addresses.rewards), parseEther('100000'));
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    const config = readConfig({
      CHAIN_ID: 31337, RPC_URL: node.rpc, APP_ORIGIN: origin, DATABASE_PATH: join(root, 'game.sqlite'),
      TOKEN_ADDRESS: addresses.token, REWARDS_ADDRESS: addresses.rewards, CLAIM_SIGNER_KEY: signer.privateKey
    });
    let gameTime = 2_000_000_000;
    async function startGame() {
      game = await createGame(config, () => gameTime);
      http = await new Promise((resolve, reject) => {
        const server = game.app.listen(port, '127.0.0.1', () => resolve(server));
        server.once('error', reject);
      });
    }
    await startGame();
    const post = (path, body, extra) => fetch(origin + '/api' + path, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body)
    });
    await t.test('rejects wrong network, origin, absent session, wrong signatures and login replay', async () => {
      assert.equal((await post('/auth/challenge', { address: player.address, chainId: 1 })).status, 400);
      assert.equal((await post('/auth/challenge', {}, { Origin: 'https://example.com' })).status, 403);
      assert.equal((await post('/farming/start', {})).status, 401);
      const response = await post('/auth/challenge', { address: player.address, chainId: 31337 });
      const { nonce, message } = await response.json();
      assert.match(message, /wants you to sign in with your Ethereum account:/);
      assert.equal((await post('/auth/login', { nonce, signature: await other.signMessage(message) })).status, 401);
      const signature = await player.signMessage(message);
      const login = await post('/auth/login', { nonce, signature });
      assert.equal(login.status, 200);
      assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
      assert.equal((await post('/auth/login', { nonce, signature })).status, 401);
      const expired = await (await post('/auth/challenge', { address: player.address, chainId: 31337 })).json();
      gameTime += 301;
      assert.equal((await post('/auth/login', { nonce: expired.nonce, signature: await player.signMessage(expired.message) })).status, 401);
      for (const target of ['/.env', '/data/game.sqlite', '/server.js', '/.git/config']) {
        assert.equal((await fetch(origin + target)).status, 404, target);
      }
    });

    browser = await chromium.launch(process.env.NKS_BROWSER_CHANNEL ? { channel: process.env.NKS_BROWSER_CHANNEL } : {});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let decline = true;
    let lastCall, transaction;
    await page.exposeFunction('walletCall', async ({ method, params }) => {
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts': return [player.address];
        case 'eth_chainId': return '0x7a69';
        case 'personal_sign': return player.signMessage(getBytes(params[0]));
        case 'eth_getTransactionReceipt': return node.provider.send(method, params);
        case 'eth_sendTransaction': {
          lastCall = params[0];
          if (decline) return { error: 'Declined in test wallet', code: 4001 };
          const sent = await player.sendTransaction({ to: lastCall.to, data: lastCall.data });
          transaction = await sent.wait();
          return sent.hash;
        }
        default: throw new Error('Unexpected wallet method ' + method);
      }
    });
    await page.addInitScript(() => {
      window.ethereum = {
        async request(call) {
          const result = await window.walletCall(call);
          if (result?.error) throw Object.assign(new Error(result.error), { code: result.code });
          return result;
        }
      };
    });
    const capture = process.env.NKS_TEST_SCREENSHOTS;
    if (capture) mkdirSync(capture, { recursive: true });

    await t.test('wallet, farming, restart, rejected submission, retry and verified receipt', async () => {
      await page.goto(origin);
      await page.getByRole('button', { name: 'Connect wallet' }).click();
      await page.getByRole('button', { name: 'Start mining' }).click();
      await expect(page.getByText(/Shift ends in/)).toBeVisible();
      await stopGame();
      gameTime += 61;
      await startGame();
      await page.reload();
      await expect(page.locator('#points')).toHaveText('60');
      await expect(page.locator('#claimable')).toHaveText('0.6 NKS');
      await page.getByRole('button', { name: 'Claim NKS' }).click();
      await expect(page.getByRole('status')).toHaveText('The wallet request was declined.');
      const original = lastCall;
      await page.reload();
      await expect(page.locator('#reserved')).toHaveText('0.6 NKS');
      await expect(page.locator('#points')).toHaveText('0');
      decline = false;
      await page.getByRole('button', { name: 'Resume claim' }).click();
      await expect(page.locator('#tx-status')).toHaveText('Claim confirmed.');
      await expect(page.locator('#balance')).toHaveText('0.6 NKS');
      assert.deepEqual(lastCall, original);
      assert.equal(transaction.status, 1);
      assert.equal(await token.balanceOf(player.address), parseEther('0.6'));
      assert.equal(await token.balanceOf(addresses.rewards), parseEther('99999.4'));
      await assert.rejects(player.sendTransaction({ to: lastCall.to, data: lastCall.data }));
      await page.reload();
      await expect(page.locator('#tx-hash')).toHaveText(transaction.hash);
      assert.deepEqual(errors, []);
      t.diagnostic(`Local token ${addresses.token}; rewards ${addresses.rewards}; successful claim ${transaction.hash}`);
      if (capture) {
        await page.screenshot({ path: join(capture, 'desktop-claim.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
        await page.screenshot({ path: join(capture, 'mobile-claim.png'), fullPage: true });
      }
    });

    await t.test('binds claim to recipient, amount, contract and chain, and rejects expired claims', async () => {
      const { args } = distributor.interface.parseTransaction({ data: lastCall.data });
      const claim = { player: player.address, amount: args.amount, nonce: '0x' + 'ab'.repeat(32), deadline: args.deadline };
      const sign = domain => signer.signTypedData(domain, claimTypes, claim);
      const domain = claimDomain(31337, addresses.rewards);
      const valid = await sign(domain);
      const wrongChain = await sign(claimDomain(84532, addresses.rewards));
      const wrongContract = await sign(claimDomain(31337, addresses.token));
      const playerClaim = distributor.connect(player).claim;
      const reject = (...parameters) => assert.rejects(playerClaim.staticCall(...parameters));
      await assert.rejects(distributor.connect(other).claim.staticCall(claim.amount, claim.nonce, claim.deadline, valid));
      await reject(claim.amount + 1n, claim.nonce, claim.deadline, valid);
      await reject(claim.amount, claim.nonce, claim.deadline, wrongChain);
      await reject(claim.amount, claim.nonce, claim.deadline, wrongContract);
      assert.equal(await distributor.used(claim.nonce), false);
      await node.provider.send('evm_setNextBlockTimestamp', [Number(claim.deadline) + 1]);
      await node.provider.send('evm_mine', []);
      const failed = await playerClaim(claim.amount, claim.nonce, claim.deadline, valid, { gasLimit: 200_000 });
      await assert.rejects(failed.wait());
      assert.equal((await node.provider.getTransactionReceipt(failed.hash)).status, 0);
      assert.equal(await distributor.used(claim.nonce), false);
      assert.equal(await token.balanceOf(player.address), parseEther('0.6'));
    });
  } finally {
    await browser?.close();
    await stopGame();
    await node.close();
  }
});
