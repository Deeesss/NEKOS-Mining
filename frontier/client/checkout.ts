export interface MarketNetwork {
  name: string;
  chainId: number;
  market: string;
  token: string;
  price: string;
  rpc: string;
  explorer: string | null;
}

type Transaction = { to: string; data: string };
export interface Checkout {
  chainId: number;
  approval: Transaction | null;
  purchase: Transaction;
}

interface Wallet {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
}

export async function buyFromMarket(
  network: MarketNetwork,
  quote: (address: string) => Promise<Checkout>,
  progress: (message: string) => void
) {
  const wallet = (window as Window & { ethereum?: Wallet }).ethereum;
  if (!wallet) throw new Error('Open the Market in a browser with an Ethereum wallet to buy Duskwear.');
  const [address] = await wallet.request<string[]>({ method: 'eth_requestAccounts' });
  if (!address) throw new Error('Select a wallet account to continue.');
  const hex = '0x' + network.chainId.toString(16);
  const chain = async () => Number(await wallet.request<string>({ method: 'eth_chainId' }));
  if (await chain() !== network.chainId) {
    const change = () => wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
    try {
      await change();
    } catch (error) {
      if ((error as { code?: number }).code !== 4902) throw error;
      await wallet.request({ method: 'wallet_addEthereumChain', params: [{
        chainId: hex, chainName: network.name, rpcUrls: [network.rpc],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        ...(network.explorer ? { blockExplorerUrls: [network.explorer] } : {})
      }] });
      await change();
    }
  }

  async function send(call: Transaction) {
    const [selected] = await wallet!.request<string[]>({ method: 'eth_accounts' });
    if (selected?.toLowerCase() !== address.toLowerCase() || await chain() !== network.chainId) {
      throw new Error('The wallet account or network changed. Try again.');
    }
    const hash = await wallet!.request<string>({
      method: 'eth_sendTransaction', params: [{ from: address, chainId: hex, ...call }]
    });
    if (!/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('Check your wallet activity before retrying.');
    return hash;
  }

  async function confirm(hash: string) {
    for (let attempt = 0; attempt < 24; attempt++) {
      if (await chain() !== network.chainId) throw new Error('Switch back to the market network to follow wallet activity.');
      const receipt = await wallet!.request<{ status: string } | null>({
        method: 'eth_getTransactionReceipt', params: [hash]
      });
      if (receipt) {
        if (BigInt(receipt.status) !== 1n) throw new Error('The transaction reverted. Check your wallet before retrying.');
        return;
      }
      await new Promise<void>(resolve => setTimeout(resolve, 1_500));
    }
    throw new Error('Still waiting for the transaction. Check your wallet activity before retrying.');
  }

  const checkout = await quote(address);
  const at = (actual: string, expected: string) => actual.toLowerCase() === expected.toLowerCase();
  if (checkout.chainId !== network.chainId || !at(checkout.purchase.to, network.market) ||
      (checkout.approval && !at(checkout.approval.to, network.token))) {
    throw new Error('The checkout does not match the displayed market.');
  }
  if (checkout.approval) {
    progress(`Approve the market to spend ${network.price} NKS.`);
    await confirm(await send(checkout.approval));
  }
  progress(`Confirm the ${network.price} NKS payment in your wallet.`);
  await confirm(await send(checkout.purchase));
}
