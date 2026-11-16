import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { GameError } from './frontier/economy.js';
import { openColonyStore } from './frontier/storage.js';

const dist = fileURLToPath(new URL('./dist/', import.meta.url));
const cookie = 'nks_frontier';
const secureCookie = '__Host-nks_frontier';

export function createFrontier({ origin, databasePath, clock = Date.now }) {
  const secure = origin.startsWith('https://');
  const cookieName = secure ? secureCookie : cookie;
  const cookies = { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 365 * 24 * 60 * 60 * 1000 };
  const store = openColonyStore(databasePath);
  const app = express();
  const token = req => req.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([a-f0-9]{64})(?:;|$)`))?.[1] || '';

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      'script-src': ["'self'"],
      'upgrade-insecure-requests': secure ? [] : null
    } },
    strictTransportSecurity: secure ? undefined : false
  }));
  const prefix = '/api/frontier';
  app.use(prefix, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method === 'POST' && req.get('origin') !== origin) {
      return res.status(403).json({ error: 'Unexpected request origin.' });
    }
    next();
  });
  const limited = n => rateLimit({
    windowMs: 60_000, limit: n, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many operations. Try again shortly.' }
  });
  app.use(prefix, limited(240), express.json({ limit: '4kb' }));

  app.get(prefix, (req, res) => {
    const state = store.update(token(req), clock());
    return state ? res.json(state) : res.status(204).end();
  });

  app.post(prefix + '/colony', limited(12), (req, res) => {
    const { protagonist, name } = req.body ?? {};
    if (!['male', 'female'].includes(protagonist)) throw new GameError('Choose one of the two stewards.', 400);
    const cleanName = typeof name === 'string' ? name.normalize('NFC').trim() : '';
    if (!cleanName || [...cleanName].length > 24 || /[\p{C}\p{Zl}\p{Zp}]/u.test(cleanName)) {
      throw new GameError('Enter a name of up to 24 characters.', 400);
    }
    const { session, state } = store.create(token(req), protagonist, cleanName, clock());
    res.cookie(cookieName, session, cookies).status(201).json(state);
  });

  app.post(prefix + '/command', limited(60), (req, res) => {
    const { action, revision, site } = req.body ?? {};
    if (typeof action !== 'string' || !Number.isSafeInteger(revision) ||
        (action === 'dispatch' && site !== 'glass-basin')) {
      throw new GameError('Invalid colony order.', 400);
    }
    const state = store.update(token(req), clock(), { action, revision });
    if (!state) throw new GameError('Your colony session could not be restored.', 401);
    res.json(state);
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown colony endpoint.' }));
  app.use(express.static(dist, { dotfiles: 'deny' }));
  app.use((error, _req, res, _next) => {
    if (error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error instanceof GameError ? error.message : 'Invalid request.' });
    }
    console.error('Frontier operation failed.', error.code ?? error.name);
    res.status(500).json({ error: 'The colony service is temporarily unavailable.' });
  });

  return { app, close: () => store.close() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const port = Number(process.env.FRONTIER_PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid FRONTIER_PORT.');
    const origin = new URL(process.env.FRONTIER_ORIGIN || `http://127.0.0.1:${port}`);
    if (origin.href !== origin.origin + '/' || !['http:', 'https:'].includes(origin.protocol) ||
        (origin.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(origin.hostname))) {
      throw new Error('FRONTIER_ORIGIN must be an HTTPS origin or loopback HTTP origin.');
    }
    if (!existsSync(new URL('./dist/index.html', import.meta.url))) throw new Error('Run npm run build before starting Frontier.');
    const game = createFrontier({ origin: origin.origin, databasePath: process.env.FRONTIER_DATABASE || 'data/frontier.sqlite' });
    const server = game.app.listen(port, '127.0.0.1', () => console.log(`NEKOS: Spice Frontier at ${origin.origin}`));
    server.once('error', error => {
      game.close();
      console.error('Frontier could not listen.', error.code);
      process.exitCode = 1;
    });
    const stop = () => server.close(() => game.close());
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch (error) {
    console.error('Frontier startup failed.', error.message);
    process.exitCode = 1;
  }
}
