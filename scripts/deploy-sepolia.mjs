import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { JsonRpcProvider, Wallet, parseEther } from 'ethers';
import { deploy } from './deployment.mjs';

const path = 'data/sepolia-deployment.json';
if (existsSync(path)) throw new Error(`Inspect existing deployment record at ${path} before any new deployment.`);
const rpc = new URL(process.env.RPC_URL || 'https://sepolia.base.org');
if (rpc.protocol !== 'https:') throw new Error('Use an HTTPS Base Sepolia RPC.');
for (const name of ['DEPLOYER_KEY', 'CLAIM_SIGNER_KEY']) {
  if (!/^0x[0-9a-f]{64}$/i.test(process.env[name] || '')) throw new Error(`Set ${name} in the ignored .env or environment.`);
}
const provider = new JsonRpcProvider(rpc.href);
try {
  if ((await provider.getNetwork()).chainId !== 84532n) throw new Error('Expected Base Sepolia (84532).');
  const deployer = new Wallet(process.env.DEPLOYER_KEY, provider);
  const signer = new Wallet(process.env.CLAIM_SIGNER_KEY);
  if (deployer.address === signer.address) throw new Error('Use distinct deployment and claim keys.');
  if (await provider.getBalance(deployer.address) < parseEther('0.0001')) {
    throw new Error(`Fund ${deployer.address} with Base Sepolia test ETH before deployment.`);
  }
  mkdirSync('data', { recursive: true });
  writeFileSync(path, JSON.stringify({ state: 'started', deployer: deployer.address, signer: signer.address }, null, 2), { flag: 'wx' });
  const checkpoint = partial => {
    writeFileSync(path + '.tmp', JSON.stringify({ chainId: 84532, deployer: deployer.address, ...partial }, null, 2));
    renameSync(path + '.tmp', path);
  };
  const addresses = await deploy(deployer, signer.address, checkpoint);
  const manifest = { state: 'funded', chainId: 84532, deployer: deployer.address, ...addresses };
  checkpoint(manifest);
  console.log(JSON.stringify(manifest, null, 2));
} catch (error) {
  console.error('Deployment stopped.', error.code ? `Code: ${error.code}.` : error.message);
  process.exitCode = 1;
} finally {
  provider.destroy();
}
