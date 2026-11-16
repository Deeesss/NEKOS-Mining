import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { FetchRequest, JsonRpcProvider, parseEther, Wallet } from 'ethers';

const require = createRequire(import.meta.url);
const binaries = {
  'win32-x64': 'win32-amd64', 'linux-x64': 'linux-amd64', 'linux-arm64': 'linux-arm64',
  'darwin-x64': 'darwin-amd64', 'darwin-arm64': 'darwin-arm64'
};

export async function startDevChain(port, extraArgs = []) {
  const platform = binaries[`${process.platform}-${process.arch}`];
  if (!platform) throw new Error('Anvil binary is unavailable for this OS and architecture.');
  const packageFile = require.resolve(`@foundry-rs/anvil-${platform}/package.json`);
  const binary = join(dirname(packageFile), 'bin', process.platform === 'win32' ? 'anvil.exe' : 'anvil');
  const rpc = `http://127.0.0.1:${port}`;
  const child = spawn(binary, ['--host', '127.0.0.1', '--port', String(port), '--chain-id', '31337', '--quiet', ...extraArgs],
    { stdio: 'ignore', windowsHide: true });
  const exit = new Promise(resolve => {
    child.once('error', resolve);
    child.once('exit', resolve);
  });
  const request = new FetchRequest(rpc);
  request.timeout = 1_000;
  const provider = new JsonRpcProvider(request, 31337, { cacheTimeout: -1 });
  async function close() {
    provider.destroy();
    if (child.exitCode === null) child.kill();
    await exit;
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    const closed = await Promise.race([exit.then(() => true), delay(100, false)]);
    if (closed) break;
    try {
      if (await provider.send('eth_chainId', []) === '0x7a69') return { rpc, provider, close };
    } catch {
      // Wait for the owned local node to accept RPC requests.
    }
  }
  await close();
  throw new Error(`Anvil could not start on port ${port}.`);
}

export async function fundedWallet(provider) {
  const wallet = Wallet.createRandom().connect(provider);
  await provider.send('anvil_setBalance', [wallet.address, '0x' + parseEther('5').toString(16)]);
  return wallet;
}
