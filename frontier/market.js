import { Contract, FetchRequest, Interface, JsonRpcProvider, Wallet, ZeroAddress, formatEther, getAddress, id } from 'ethers';

const marketAbi = [
  'function token() view returns (address)',
  'function treasury() view returns (address)',
  'function signer() view returns (address)',
  'function price() view returns (uint256)',
  'function buyerOf(bytes32 orderId) view returns (address)',
  'function buyDuskwear(bytes32 orderId,uint256 deadline,bytes signature)'
];
const tokenAbi = [
  'function approve(address spender,uint256 amount) returns (bool)',
  'function balanceOf(address buyer) view returns (uint256)',
  'function allowance(address buyer,address spender) view returns (uint256)'
];
const orderTypes = { DuskwearOrder: [
  { name: 'orderId', type: 'bytes32' },
  { name: 'buyer', type: 'address' },
  { name: 'deadline', type: 'uint256' }
] };

export function orderIdFor(colonyId) { return id('NEKOS Frontier Duskwear ' + colonyId); }

export async function connectMarket({ chainId, rpcUrl, address, signerKey, expectedToken, expectedTreasury }) {
  if (![31337, 84532].includes(chainId)) throw new Error('Market network must be local Anvil or Base Sepolia.');
  const local = chainId === 31337;
  const rpc = new URL(rpcUrl);
  if (local ? !['127.0.0.1', 'localhost'].includes(rpc.hostname) : rpc.protocol !== 'https:') {
    throw new Error('Invalid network RPC for market.');
  }
  const marketAddress = getAddress(address);
  const request = new FetchRequest(rpc.href);
  request.timeout = 5_000;
  const provider = new JsonRpcProvider(request, chainId, { cacheTimeout: -1, batchMaxCount: 1 });
  try {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== chainId) throw new Error('RPC network does not match the market deployment.');
    const market = new Contract(marketAddress, marketAbi, provider);
    const [tokenAddress, contractSigner, treasury, price] = await Promise.all([
      market.token(), market.signer(), market.treasury(), market.price()
    ]);
    const signer = new Wallet(signerKey);
    if (signer.address !== contractSigner || getAddress(expectedToken) !== tokenAddress ||
        getAddress(expectedTreasury) !== treasury || price <= 0n) {
      throw new Error('Market token, treasury, signer or price does not match deployment settings.');
    }
    const token = new Contract(tokenAddress, tokenAbi, provider);
    const buy = new Interface(marketAbi);
    const erc20 = new Interface(tokenAbi);
    const domain = { name: 'NEKOS Frontier Market', version: '1', chainId, verifyingContract: marketAddress };
    return {
      identity: `${chainId}:${marketAddress}`,
      config: {
        name: local ? 'Local NEKOS' : 'Base Sepolia', chainId, market: marketAddress, token: tokenAddress,
        price: formatEther(price), rpc: local ? rpc.origin : 'https://sepolia.base.org',
        explorer: local ? null : 'https://sepolia.basescan.org'
      },
      close: () => provider.destroy(),
      async buyer(orderId, finalized = true) {
        const address = await market.buyerOf(orderId, { blockTag: local || !finalized ? 'latest' : 'finalized' });
        return address === ZeroAddress ? null : address;
      },
      async quote(orderId, buyer) {
        if (buyer === treasury || buyer === ZeroAddress) throw new Error('Choose a player wallet.');
        const [funds, allowance, block] = await Promise.all([
          token.balanceOf(buyer), token.allowance(buyer, marketAddress), provider.getBlock('latest')
        ]);
        if (funds < price) throw new Error('This wallet does not have enough test NKS.');
        const deadline = block.timestamp + 600;
        const signature = await signer.signTypedData(domain, orderTypes, { orderId, buyer, deadline });
        const approval = allowance >= price ? null : {
          to: tokenAddress, data: erc20.encodeFunctionData('approve', [marketAddress, price])
        };
        return { approval, purchase: { to: marketAddress, data: buy.encodeFunctionData('buyDuskwear', [orderId, deadline, signature]) } };
      }
    };
  } catch (error) {
    provider.destroy();
    throw error;
  }
}

export async function marketFromEnv(env = process.env) {
  if (!env.FRONTIER_MARKET_ADDRESS) return null;
  return connectMarket({
    chainId: Number(env.FRONTIER_MARKET_CHAIN_ID || 84532),
    rpcUrl: env.FRONTIER_MARKET_RPC || 'https://sepolia.base.org',
    address: env.FRONTIER_MARKET_ADDRESS, signerKey: env.FRONTIER_MARKET_SIGNER_KEY,
    expectedToken: env.FRONTIER_MARKET_TOKEN, expectedTreasury: env.FRONTIER_MARKET_TREASURY
  });
}
