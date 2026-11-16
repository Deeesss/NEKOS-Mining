import { Contract, FetchRequest, getAddress, id, Interface, JsonRpcProvider, Wallet } from 'ethers';

export const POINT_VALUE = 10n ** 16n;
export const CLAIM_WINDOW = 600;
export const TOKEN_ABI = ['function balanceOf(address) view returns (uint256)'];
export const REWARDS_ABI = [
  'function signer() view returns (address)',
  'function token() view returns (address)',
  'function claim(uint256 amount,bytes32 nonce,uint256 deadline,bytes signature)',
  'function used(bytes32) view returns (bool)',
  'event Claimed(bytes32 indexed nonce,address indexed player,uint256 amount)'
];

export function claimDomain(chainId, rewards) {
  return { name: 'NEKOS SPICE Rewards', version: '1', chainId, verifyingContract: rewards };
}

export const claimTypes = {
  Claim: [
    { name: 'player', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' }
  ]
};

export async function connectChain(config) {
  const request = new FetchRequest(config.rpcUrl);
  request.timeout = 8_000;
  const provider = new JsonRpcProvider(request, undefined, { cacheTimeout: -1, batchMaxCount: 1 });
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(config.chainId)) throw new Error('RPC chain ID does not match configuration.');
    const token = new Contract(config.token, TOKEN_ABI, provider);
    const rewards = new Contract(config.rewards, REWARDS_ABI, provider);
    const signer = new Wallet(config.signerKey);
    const [contractSigner, contractToken] = await Promise.all([rewards.signer(), rewards.token()]);
    if (getAddress(contractSigner) !== signer.address || getAddress(contractToken) !== config.token) {
      throw new Error('Reward contract signer or token does not match configuration.');
    }
    const iface = new Interface(REWARDS_ABI);
    const domain = claimDomain(config.chainId, config.rewards);

    return {
      close: () => provider.destroy(),
      encodeClaim: (amount, nonce, deadline, signature) => iface.encodeFunctionData('claim', [amount, nonce, deadline, signature]),
      sign: claim => signer.signTypedData(domain, claimTypes, claim),
      balance: address => token.balanceOf(address),
      async anchor(tag) {
        const block = await provider.getBlock(tag ?? (config.local ? 'latest' : 'finalized'));
        if (!block) throw new Error('Missing settlement block');
        return block;
      },
      async pool(anchor) {
        return token.balanceOf(config.rewards, { blockTag: anchor.number });
      },
      async claimState(claim, anchor) {
        if (!await rewards.used(claim.nonce, { blockTag: anchor.number })) {
          return anchor.timestamp > claim.deadline ? 'expired' : 'reserved';
        }
        const logs = await provider.getLogs({
          address: config.rewards,
          fromBlock: claim.from_block,
          toBlock: anchor.number,
          topics: [id('Claimed(bytes32,address,uint256)'), claim.nonce]
        });
        if (logs.length !== 1) throw new Error('Missing finalized claim event');
        const { args } = iface.parseLog(logs[0]);
        if (args.player !== claim.player || args.amount !== BigInt(claim.points) * POINT_VALUE) {
          throw new Error('Unexpected finalized claim');
        }
        return logs[0].transactionHash;
      }
    };
  } catch (error) {
    provider.destroy();
    throw error;
  }
}
