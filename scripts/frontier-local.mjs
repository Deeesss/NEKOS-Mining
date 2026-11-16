import { loadEnvFile } from 'node:process';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fundedWallet, startDevChain } from './dev-chain.mjs';
import { deployLocalMarket } from './deploy-market.mjs';
import { connectMarket } from '../frontier/market.js';
import { createFrontier } from '../frontier.js';

const directory = 'data/market-local';
const state = `${directory}/anvil.json`;
const manifest = `${directory}/market.json`;
const pending = `${directory}/setup.pending`;
let node, game, server;
let stopping = false;

async function snapshot() {
  const encoded = await node.provider.send('anvil_dumpState', []);
  writeFileSync(state + '.tmp', gunzipSync(Buffer.from(encoded.slice(2), 'hex')), { mode: 0o600 });
  renameSync(state + '.tmp', state);
}

async function stop() {
  if (stopping) return;
  stopping = true;
  if (server?.listening) await new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  });
  game?.close();
  if (node) {
    try { await snapshot(); }
    finally { await node.close(); }
  }
}

try {
  if (existsSync('.env')) loadEnvFile('.env');
  const port = Number(process.env.FRONTIER_PORT || 3000);
  const rpcPort = Number(process.env.FRONTIER_LOCAL_RPC_PORT || 8545);
  if (![port, rpcPort].every(p => Number.isInteger(p) && p > 0 && p <= 65535) || port === rpcPort) {
    throw new Error('Choose valid, distinct Frontier and RPC ports.');
  }
  const active = await fetch(`http://127.0.0.1:${rpcPort}`, { signal: AbortSignal.timeout(1_000) }).then(() => true, () => false);
  if (active) throw new Error(`RPC port ${rpcPort} is in use.`);
  mkdirSync(directory, { recursive: true });
  const existing = existsSync(manifest);
  if (existsSync(pending) || existing !== existsSync(state)) {
    throw new Error('Market deployment and Anvil state need to be restored together.');
  }
  node = await startDevChain(rpcPort, existing ? ['--load-state', state] : []);
  let config;
  if (existing) config = JSON.parse(readFileSync(manifest, 'utf8'));
  else {
    writeFileSync(pending, '', { flag: 'wx' });
    const player = await fundedWallet(node.provider);
    const deployer = await fundedWallet(node.provider);
    config = { ...await deployLocalMarket(deployer, player), playerKey: player.privateKey };
    await snapshot();
    writeFileSync(manifest, JSON.stringify(config, null, 2), { mode: 0o600, flag: 'wx' });
    unlinkSync(pending);
  }
  const market = await connectMarket({ ...config, rpcUrl: node.rpc });
  const origin = `http://127.0.0.1:${port}`;
  game = createFrontier({ origin, databasePath: process.env.FRONTIER_DATABASE || 'data/frontier.sqlite', market });
  // Save the local chain before confirming ownership to the local save file.
  const buyer = market.buyer;
  let saving = Promise.resolve();
  market.buyer = async (...args) => {
    const address = await buyer(...args);
    if (address && args[1] !== false) {
      saving = saving.catch(() => {}).then(snapshot);
      await saving;
    }
    return address;
  };
  server = game.app.listen(port, '127.0.0.1');
  await new Promise((resolve, reject) => server.once('listening', resolve).once('error', reject));
  console.log(`NEKOS: Spice Frontier at ${origin} (local NKS market)`);
  console.log(`Import playerKey from ${manifest} into a dedicated local test wallet only.`);
  const shutdown = () => void stop().catch(() => { process.exitCode = 1; });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error('Local NKS market startup failed.', error.code ?? error.message);
  await stop();
  process.exitCode = 1;
}
