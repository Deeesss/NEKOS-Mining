import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { formatUnits, getAddress, verifyMessage } from 'ethers';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readConfig } from './lib/config.js';
import { connectChain, CLAIM_WINDOW, POINT_VALUE } from './lib/chain.js';
import { openStore, SHIFT_SECONDS } from './lib/store.js';

const SESSION_SECONDS = 8 * 60 * 60;
const CHALLENGE_SECONDS = 5 * 60;
const second = () => Math.floor(Date.now() / 1000);
const iso = timestamp => new Date(timestamp * 1000).toISOString();

export async function createGame(config, now = second) {
  const chain = await connectChain(config);
  let store;
  try {
    const anchor = await chain.anchor();
    await chain.pool(anchor);
    store = openStore(config.databasePath, [config.chainId, config.token, config.rewards].join(':'));
  } catch (error) {
    chain.close();
    throw error;
  }

  const app = express();
  const secure = config.origin.startsWith('https:');
  const cookie = secure ? '__Host-nks_session' : 'nks_session';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'strict', path: '/' };
  const tokenOf = req => req.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${cookie}=([a-f0-9]{64})(?:;|$)`))?.[1] ?? '';
  const limit = count => rateLimit({
    windowMs: 60_000, limit: count, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many requests. Try again in a minute.' }
  });

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: { 'script-src': ["'self'"], 'style-src': ["'self'"], 'upgrade-insecure-requests': secure ? [] : null }
    },
    strictTransportSecurity: secure ? undefined : false
  }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method === 'POST' && req.get('origin') !== config.origin) {
      return res.status(403).json({ error: 'Unexpected request origin.' });
    }
    next();
  });
  app.use('/api', limit(240), express.json({ limit: '4kb' }));
  app.use('/api/auth', limit(24));

  app.get('/api/config', (_req, res) => res.json({
    chainId: config.chainId, name: config.name, token: config.token,
    rpc: config.walletRpc, explorer: config.explorer, shiftSeconds: SHIFT_SECONDS
  }));

  app.post('/api/auth/challenge', (req, res) => {
    let address;
    try {
      address = getAddress(req.body?.address);
    } catch {
      return res.status(400).json({ error: 'Enter a valid Ethereum address.' });
    }
    if (req.body.chainId !== config.chainId) return res.status(400).json({ error: `Switch to ${config.name}.` });
    const issued = now();
    const expires = issued + CHALLENGE_SECONDS;
    const nonce = randomBytes(16).toString('hex');
    const { protocol, host } = new URL(config.origin);
    const message = [
      `${protocol}//${host} wants you to sign in with your Ethereum account:`, address, '',
      'Sign in to NEKOS Mining.', '', `URI: ${config.origin}/`, 'Version: 1',
      `Chain ID: ${config.chainId}`, `Nonce: ${nonce}`, `Issued At: ${iso(issued)}`, `Expiration Time: ${iso(expires)}`
    ].join('\n');
    store.challenge(nonce, address, message, expires, issued);
    res.json({ nonce, message });
  });

  app.post('/api/auth/login', (req, res) => {
    const { nonce, signature } = req.body || {};
    const record = typeof nonce === 'string' && /^[a-f0-9]{32}$/.test(nonce) && store.getChallenge(nonce);
    let valid = false;
    if (record && record.expires > now() && typeof signature === 'string' && /^0x[a-f0-9]{130}$/i.test(signature)) {
      try {
        valid = verifyMessage(record.message, signature) === record.player;
      } catch {
        // Invalid signature encoding.
      }
    }
    if (!valid) return res.status(401).json({ error: 'Wallet signature could not be verified. Sign in again.' });
    const token = store.login(nonce, record.player, now(), SESSION_SECONDS, tokenOf(req));
    if (!token) return res.status(401).json({ error: 'This sign-in request is no longer valid.' });
    res.cookie(cookie, token, { ...cookieOptions, maxAge: SESSION_SECONDS * 1000 });
    res.json({ address: record.player });
  });

  app.post('/api/auth/logout', (req, res) => {
    store.logout(tokenOf(req));
    res.clearCookie(cookie, cookieOptions).status(204).end();
  });

  app.use('/api', (req, res, next) => {
    req.player = store.session(tokenOf(req), now());
    if (!req.player) return res.status(401).json({ error: 'Connect your wallet to continue.' });
    next();
  });

  async function reconcile(record, anchor) {
    if (!record) return;
    const result = await chain.claimState(record, anchor);
    if (result !== 'reserved') store.resolveClaim(record, result, anchor.number);
  }

  app.get('/api/game', async (req, res) => {
    const current = store.reserved(req.player);
    let chainAvailable = true;
    let minedTransaction = null;
    let walletNks = null;
    try {
      if (current) {
        const anchor = await chain.anchor();
        await reconcile(current, anchor);
        const stillReserved = store.reserved(req.player);
        if (!config.local && stillReserved?.nonce === current.nonce) {
          const mined = await chain.claimState(current, await chain.anchor('latest'));
          if (mined.startsWith('0x')) minedTransaction = mined;
        }
      }
      walletNks = formatUnits(await chain.balance(req.player), 18);
    } catch {
      chainAvailable = false;
    }
    const { pending, points, lastTransaction, shiftEndsAt } = store.dashboard(req.player, now());
    res.json({
      address: req.player, points, shiftEndsAt, serverTime: now(),
      claimableNks: formatUnits(BigInt(points) * POINT_VALUE, 18),
      pending: pending ? { nks: formatUnits(BigInt(pending.points) * POINT_VALUE, 18), deadline: pending.deadline, minedTransaction } : null,
      lastTransaction, walletNks, chainAvailable
    });
  });

  app.post('/api/farming/start', (req, res) => {
    store.shift(req.player, now());
    res.status(204).end();
  });

  app.post('/api/claim', limit(30), async (req, res) => {
    let anchor, latest, pool;
    try {
      [anchor, latest] = await Promise.all([chain.anchor(), chain.anchor('latest')]);
      await reconcile(store.reserved(req.player), anchor);
      const openClaim = store.reserved(req.player);
      if (openClaim) {
        const state = await chain.claimState(openClaim, latest);
        if (state !== 'reserved') {
          return res.status(409).json({ error: 'Awaiting finality before this claim can be settled.' });
        }
      } else {
        for (const record of store.due(anchor.timestamp)) await reconcile(record, anchor);
        pool = await chain.pool(anchor);
      }
    } catch {
      return res.status(503).json({ error: 'Chain unavailable. Try again shortly.' });
    }

    const record = pool === undefined ? store.reserved(req.player) : store.reserve(
      req.player, now(), anchor.number, latest.timestamp + CLAIM_WINDOW, Number(pool / POINT_VALUE)
    );
    if (!record) return res.status(409).json({ error: 'No completed shift or funded rewards available to claim.' });
    if (record.deadline <= latest.timestamp) return res.status(409).json({ error: 'Awaiting finality for this expired claim.' });
    const amount = BigInt(record.points) * POINT_VALUE;
    const { nonce, deadline, player } = record;
    const signature = record.signature || await chain.sign({ player, amount, nonce, deadline });
    if (!store.saveSignature(nonce, signature)) return res.status(409).json({ error: 'Claim state changed. Refresh and try again.' });
    res.json({ chainId: config.chainId, to: config.rewards, data: chain.encodeClaim(amount, nonce, deadline, signature) });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown game endpoint.' }));
  app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url)), { dotfiles: 'deny' }));
  app.use((error, _req, res, _next) => {
    if (error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: 'Invalid request.' });
    }
    console.error('NEKOS request failed internally.');
    res.status(500).json({ error: 'Game service unavailable. Try again shortly.' });
  });
  return { app, close() { store.close(); chain.close(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = readConfig();
    const game = await createGame(config);
    const server = game.app.listen(config.port, '127.0.0.1', () => {
      console.log(`NEKOS Mining listening on ${config.origin} (${config.name})`);
    });
    function stop() { server.close(() => game.close()); }
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch (error) {
    console.error('NEKOS startup failed.', error.code ? `Code: ${error.code}.` : error.message);
    process.exitCode = 1;
  }
}
