const element = id => document.getElementById(id);
const wallet = window.ethereum;
const set = (id, value) => { element(id).textContent = value; };
const same = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());
let config, game, address, account, chainId, pendingHash;
let busy = false;
let revision = 0;
let syncing = false;
let nextPoll = 0;
let clockOffset = 0;

async function api(path, body) {
  const options = body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  };
  const response = await fetch('/api' + path, { ...options, signal: AbortSignal.timeout(20_000) });
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error), { status: response.status });
  return result;
}

const ready = () => same(account, address) && chainId === config?.chainId;
const hashKey = () => `nks-tx:${config.chainId}:${address.toLowerCase()}`;
const nks = value => value == null ? '—' : value + ' NKS';

function renderShift() {
  const seconds = config?.shiftSeconds ?? 60;
  const ends = game?.shiftEndsAt;
  const left = ends ? Math.max(0, Math.min(seconds, Math.ceil(ends - Date.now() / 1000 - clockOffset))) : seconds;
  element('shift').max = seconds;
  element('shift').value = ends ? seconds - left : 0;
  set('shift-status', ends ? (left ? `Shift ends in ${left}s` : 'Finishing shift…') :
    ready() ? `A ${seconds}s mining shift earns ${seconds} spice points.` : 'Connect your wallet to start a shift.');
}

function render() {
  const connected = ready();
  const wrongNetwork = account && chainId !== config?.chainId;
  set('network', config?.name || 'Unavailable');
  set('wallet', connected ? address.slice(0, 6) + '…' + address.slice(-4) : wrongNetwork ? 'Switch network' : 'Connect wallet');
  element('wallet').disabled = busy || !config || connected;
  element('logout').hidden = !address;
  element('logout').disabled = busy;
  element('start').disabled = busy || !connected || !game || Boolean(game.shiftEndsAt);
  const mined = game?.pending?.minedTransaction;
  element('claim').disabled = busy || !connected || !game?.chainAvailable || Boolean(mined || pendingHash)
    || (!game?.pending && !game?.points);
  set('claim', game?.pending && !mined ? 'Resume claim' : 'Claim NKS');
  set('points', game?.points ?? '—');
  set('claimable', nks(game?.claimableNks));
  element('reserved-row').hidden = !game?.pending;
  set('reserved', nks(game?.pending?.nks));
  set('balance', nks(game?.walletNks));
  const explorer = config?.explorer;
  const hash = mined || pendingHash || game?.lastTransaction;
  element('token-link').hidden = !explorer;
  if (explorer) element('token-link').href = explorer + '/token/' + config.token;
  element('transaction').hidden = !hash;
  set('tx-status', mined ? 'Mined. Awaiting finality.' : pendingHash ? 'Submitted to network.' : 'Claim confirmed.');
  element('tx-link').hidden = !hash || !explorer;
  element('tx-hash').hidden = !hash || Boolean(explorer);
  if (hash && explorer) element('tx-link').href = explorer + '/tx/' + hash;
  set('tx-hash', hash || '');
  renderShift();
}

function useGame(state) {
  game = state;
  clockOffset = state.serverTime - Date.now() / 1000;
}

function clearHash() {
  sessionStorage.removeItem(hashKey());
  pendingHash = null;
}

async function refresh() {
  if (!ready() || syncing) return;
  syncing = true;
  const version = revision;
  try {
    const state = await api('/game');
    if (revision !== version) return;
    useGame(state);
    if (pendingHash && (!state.pending || state.pending.minedTransaction)) clearHash();
    if (pendingHash) {
      const receipt = await wallet.request({ method: 'eth_getTransactionReceipt', params: [pendingHash] }).catch(() => null);
      if (revision !== version) return;
      if (receipt && BigInt(receipt.status) === 0n) {
        clearHash();
        set('status', 'The transaction failed. You can resume the claim.');
      }
    }
    if (!state.chainAvailable) set('status', 'Chain data is temporarily unavailable. Mining progress is saved.');
    else if (element('status').textContent.startsWith('Chain data')) set('status', '');
  } catch (error) {
    if (revision !== version) return;
    if (error.status === 401) address = game = pendingHash = null;
    set('status', error.message || 'Could not refresh mining status.');
  } finally {
    syncing = false;
    nextPoll = Date.now() + (game?.shiftEndsAt || game?.pending ? 4_000 : 12_000);
    render();
  }
}

async function switchNetwork() {
  chainId = Number(await wallet.request({ method: 'eth_chainId' }));
  if (chainId === config.chainId) return;
  const target = '0x' + config.chainId.toString(16);
  const change = () => wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target }] });
  try {
    await change();
  } catch (error) {
    if (error.code !== 4902) throw error;
    await wallet.request({ method: 'wallet_addEthereumChain', params: [{
      chainId: target, chainName: config.name, rpcUrls: [config.rpc],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      ...(config.explorer ? { blockExplorerUrls: [config.explorer] } : {})
    }] });
    await change();
  }
  chainId = Number(await wallet.request({ method: 'eth_chainId' }));
  if (chainId !== config.chainId) throw new Error(`Switch to ${config.name} in your wallet.`);
}

async function confirmContext(expected) {
  const [[current], network] = await Promise.all([
    wallet.request({ method: 'eth_accounts' }), wallet.request({ method: 'eth_chainId' })
  ]);
  if (!same(expected, current) || Number(network) !== config.chainId) {
    throw new Error('Wallet account or network changed. Connect again.');
  }
}

function bind(id, action) {
  element(id).addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    set('status', '');
    render();
    try {
      await action();
    } catch (error) {
      set('status', error.code === 4001 ? 'The wallet request was declined.' :
        error.code === -32002 ? 'Open your wallet to finish the pending request.' :
        error.message || 'The action failed. Try again.');
    } finally {
      busy = false;
      render();
    }
  });
}

bind('wallet', async () => {
  if (!wallet) throw new Error('Open this page in a browser with an Ethereum wallet.');
  await wallet.request({ method: 'eth_requestAccounts' });
  await switchNetwork();
  const [selected] = await wallet.request({ method: 'eth_accounts' });
  if (!selected) throw new Error('Select a wallet account to play.');
  account = selected;
  if (!same(selected, address)) {
    const challenge = await api('/auth/challenge', { address: selected, chainId });
    const bytes = Array.from(new TextEncoder().encode(challenge.message), byte => byte.toString(16).padStart(2, '0')).join('');
    const signature = await wallet.request({ method: 'personal_sign', params: ['0x' + bytes, selected] });
    await confirmContext(selected);
    const result = await api('/auth/login', { nonce: challenge.nonce, signature });
    revision++;
    address = result.address;
    game = null;
    pendingHash = sessionStorage.getItem(hashKey());
  }
  await refresh();
});

bind('logout', async () => {
  await api('/auth/logout', {});
  revision++;
  address = game = pendingHash = null;
});

bind('start', async () => {
  if (!ready()) return;
  await api('/farming/start', {});
  await refresh();
});

bind('claim', async () => {
  if (!ready()) return;
  const player = address;
  const key = hashKey();
  const call = await api('/claim', {});
  await confirmContext(player);
  if (call.chainId !== config.chainId) throw new Error('Claim was issued for another network.');
  const hash = await wallet.request({ method: 'eth_sendTransaction', params: [{
    from: player, to: call.to, data: call.data, chainId: '0x' + call.chainId.toString(16)
  }] });
  if (!/^0x[a-f0-9]{64}$/i.test(hash)) throw new Error('Check your wallet activity before retrying the claim.');
  sessionStorage.setItem(key, hash);
  if (ready() && same(address, player)) {
    pendingHash = hash;
    await refresh();
  }
});

function walletChanged() {
  revision++;
  game = null;
  pendingHash = ready() ? sessionStorage.getItem(hashKey()) : null;
  nextPoll = 0;
  render();
}

wallet?.on?.('chainChanged', value => {
  chainId = Number(value);
  walletChanged();
});
wallet?.on?.('accountsChanged', accounts => {
  account = accounts[0];
  walletChanged();
});

try {
  config = await api('/config');
  if (wallet) {
    const [accounts, network] = await Promise.all([
      wallet.request({ method: 'eth_accounts' }), wallet.request({ method: 'eth_chainId' })
    ]);
    account = accounts[0];
    chainId = Number(network);
    if (account && chainId === config.chainId) {
      const state = await api('/game').catch(error => {
        if (error.status !== 401) throw error;
        return null;
      });
      if (same(account, state?.address)) {
        address = state.address;
        useGame(state);
        pendingHash = sessionStorage.getItem(hashKey());
      }
    }
  }
} catch (error) {
  set('status', error.message || 'Unable to connect to the game.');
}

render();
setInterval(() => {
  renderShift();
  if (ready() && Date.now() >= nextPoll) void refresh();
}, 1_000);
