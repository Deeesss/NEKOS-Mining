import { getAddress } from 'ethers';

export function readConfig(env = process.env) {
  const chainId = Number(env.CHAIN_ID || 84532);
  if (![31337, 84532].includes(chainId)) throw new Error('Use Base Sepolia (84532) or the local development chain (31337).');
  const local = chainId === 31337;
  const origin = new URL(env.APP_ORIGIN || 'http://127.0.0.1:3000');
  if (origin.href !== origin.origin + '/' ||
      (origin.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(origin.hostname))) {
    throw new Error('APP_ORIGIN must be an HTTPS origin or loopback HTTP origin.');
  }
  const rpc = new URL(env.RPC_URL || (local ? 'http://127.0.0.1:8545' : 'https://sepolia.base.org'));
  if (local ? !['127.0.0.1', 'localhost'].includes(rpc.hostname) : rpc.protocol !== 'https:') {
    throw new Error('RPC_URL must use loopback for local development or HTTPS for Base Sepolia.');
  }
  if (!/^0x[0-9a-f]{64}$/i.test(env.CLAIM_SIGNER_KEY || '')) {
    throw new Error('Set a dedicated CLAIM_SIGNER_KEY in the ignored .env or environment.');
  }
  let token, rewards;
  try {
    token = getAddress(env.TOKEN_ADDRESS);
    rewards = getAddress(env.REWARDS_ADDRESS);
  } catch {
    throw new Error('Set TOKEN_ADDRESS and REWARDS_ADDRESS from the deployment manifest.');
  }
  const port = Number(env.PORT || origin.port || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid application port.');
  return {
    local, chainId, port, origin: origin.origin, rpcUrl: rpc.href, token, rewards,
    signerKey: env.CLAIM_SIGNER_KEY,
    databasePath: env.DATABASE_PATH || 'data/neko.sqlite',
    name: local ? 'Local NEKOS' : 'Base Sepolia',
    walletRpc: local ? rpc.origin : 'https://sepolia.base.org',
    explorer: local ? null : 'https://sepolia.basescan.org'
  };
}
