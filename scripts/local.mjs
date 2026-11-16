import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Wallet, JsonRpcProvider } from 'ethers';
import { setTimeout as delay } from 'node:timers/promises';
import { fundedWallet, startDevChain } from './dev-chain.mjs';
import { deploy } from './deployment.mjs';
import { createGame } from '../server.js';
import { readConfig } from '../lib/config.js';

const dir = 'data/local';
const manifestPath = `${dir}/deployment.json`;
const pendingPath = `${dir}/pending.json`;
const statePath = `${dir}/anvil.json`;
let node, game, server, snapshot;
let stopping = false;

async function stop() {
  if (stopping) return;
  stopping = true;
  if (server) await new Promise(resolve => server.close(resolve));
  game?.close();
  if (node) {
    try {
      await snapshot?.();
    } finally {
      await node.close();
    }
  }
}

try {
  const port = Number(process.env.NKS_LOCAL_PORT || 3000);
  const rpcPort = Number(process.env.NKS_LOCAL_RPC_PORT || 8545);
  if (![port, rpcPort].every(value => Number.isInteger(value) && value > 0 && value <= 65535) || port === rpcPort) {
    throw new Error('Choose distinct valid local ports.');
  }
  mkdirSync(dir, { recursive: true });
  // Refuse a live local RPC before attempting to start a second node on its port.
  const running = await fetch(`http://127.0.0.1:${rpcPort}`, { signal: AbortSignal.timeout(1_000) }).then(() => true, () => false);
  if (running) throw new Error(`Local RPC port ${rpcPort} is already in use.`);
  const existing = existsSync(manifestPath);
  if (existsSync(pendingPath)) {
    throw new Error('Local setup was interrupted. Move data/local aside before setting up a fresh development chain.');
  }
  if (existing !== existsSync(statePath)) throw new Error('Local deployment and chain snapshot must be restored together.');
  node = await startDevChain(rpcPort, existing ? ['--load-state', statePath] : []);
  snapshot = async () => {
    const state = await node.provider.send('anvil_dumpState', []);
    // Anvil's RPC returns a gzip snapshot. The CLI --load-state reads the JSON dump format.
    const { gunzipSync } = await import('node:zlib');
    const { renameSync } = await import('node:fs');
    writeFileSync(statePath + '.tmp', gunzipSync(Buffer.from(state.slice(2), 'hex')), { mode: 0o600 });
    renameSync(statePath + '.tmp', statePath);
  };
  let keys;
  if (existing) {
    keys = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } else {
    const player = await fundedWallet(node.provider);
    const deployer = await fundedWallet(node.provider);
    keys = { playerKey: player.privateKey, signerKey: Wallet.createRandom().privateKey };
    writeFileSync(pendingPath, '{}', { mode: 0o600, flag: 'wx' });
    Object.assign(keys, await deploy(deployer, new Wallet(keys.signerKey).address));
    await snapshot();
    writeFileSync(manifestPath, JSON.stringify(keys, null, 2), { mode: 0o600, flag: 'wx' });
    const { unlinkSync } = await import('node:fs');
    unlinkSync(pendingPath);
  }
  const config = readConfig({
    CHAIN_ID: '31337', APP_ORIGIN: `http://127.0.0.1:${port}`, RPC_URL: node.rpc,
    DATABASE_PATH: `${dir}/game.sqlite`, TOKEN_ADDRESS: keys.token, REWARDS_ADDRESS: keys.rewards,
    CLAIM_SIGNER_KEY: keys.signerKey
  });
  game = await createGame(config);
  server = game.app.listen(port, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  console.log(`NEKOS Mining: ${config.origin} (Local NEKOS)`);
  console.log(`Import the local-only playerKey from ${manifestPath} into a separate test wallet.`);
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
} catch (error) {
  console.error('Local setup failed.', error.code || error.message);
  await stop();
  process.exitCode = 1;
}
