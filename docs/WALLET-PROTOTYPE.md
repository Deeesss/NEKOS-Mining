# NEKOS Mining

NEKOS Mining is a desert sci-fi idle mining game. Connect an Ethereum wallet, work a shift, and claim test NKS from a prefunded rewards contract. This prototype targets local Anvil and Base Sepolia.

## Play locally

You need Node.js 24+, npm, Git, and an Ethereum browser wallet that supports EIP-1193 and externally owned accounts.

```sh
npm ci --ignore-scripts
npm run dev:wallet
```

1. Open http://127.0.0.1:3000.
2. Import the generated `playerKey` from `data/local/deployment.json` into a separate development wallet. It holds local development ETH at chain ID 31337. Keep this key off public networks.
3. Click **Connect wallet**, approve the network switch if prompted, and sign the login message.
4. Click **Start mining** and wait 60 seconds. A completed shift earns 60 spice points, worth 0.60 test NKS under the prototype rules.
5. Click **Claim NKS** and approve the transaction. The vault displays the on-chain balance and transaction hash. A rejected transaction leaves the claim resumable.

Stop the local server with Ctrl+C. The SQLite ledger, local wallet and Anvil snapshot live under `data/local/`. Keep those files together when backing up. Graceful shutdown saves the chain snapshot. After an abrupt stop, Anvil can resume from the last saved snapshot. To start a fresh sandbox, stop the server and move the whole `data/local/` directory aside.

## Base Sepolia

Use dedicated testnet-only wallets. The deployer needs Base Sepolia test ETH and the claim signer needs no funds. Configure the keys in the ignored `.env` using `.env.example`. The default RPC is the official public Base Sepolia endpoint. See [Base network and free faucets](https://docs.base.org/get-started/get-funds).

```sh
npm run deploy:sepolia
```

Deployment compiles Solidity with the pinned compiler, deploys the fixed-supply token and distributor, and transfers the supply to the distributor. It checks chain ID 84532 before broadcasting. Inspect `data/sepolia-deployment.json` for addresses and transaction hashes. If deployment stops partway through, inspect its checkpoint and receipts before recovering. The command refuses to overwrite the record or redeploy blindly.

Set `TOKEN_ADDRESS` and `REWARDS_ADDRESS` from the manifest. Once deployment and funding are finalized, run `npm run start:wallet` and open http://127.0.0.1:3000. The player wallet also needs Base Sepolia test ETH for claim gas. The game links to the token and confirmed claim on BaseScan. Save both explorer links and the player's balance as on-chain evidence.

## Tests

```sh
npx playwright install chromium
node --test test/game.test.mjs
npm run compile
npm run check:secrets
```

Set `NKS_BROWSER_CHANNEL=chrome` to use installed Chrome. The browser test uses an EIP-1193 development adapter with real cryptographic signatures and signed transactions against Anvil. It covers a completed shift, restart, wallet rejection and retry, wallet balance, transaction receipt, invalid authentication, wrong network, replay, incorrect EIP-712 scope and an expired transaction that reverts. Set `NKS_TEST_SCREENSHOTS=test-results/review` to save desktop and mobile screenshots.

## Trust boundaries

- The server authenticates a wallet using a single-use ERC-4361 challenge and an HTTP-only session cookie. Supported wallets are EIP-1193 EOA wallets. The API accepts state changes from the configured origin and serves only files under `public/`.
- SQLite tracks shifts, balances, reservations and settlement. Each shift uses server time. A reserved claim debits the internal point balance atomically. The signed EIP-712 authorization includes the player, amount, nonce, deadline, chain and distributor.
- The distributor verifies the wallet caller and signature and records the nonce before sending NKS. On Base Sepolia the backend uses finalized chain state to settle a reservation or return points after expiration. RPC failures retain reservations for retry.
- The distributor signer is immutable. Keep its dedicated private key offline from public files and deployment credentials. The testnet prototype has basic per-IP request limits. Deployment for a public economy would need a separate abuse and key lifecycle design.
- The 2024 simulation had no authoritative game balances to migrate. This project starts with a new local ledger.

See [prototype economics](../TOKENOMICS.md) and [branding and asset terms](../ASSETS_LICENSE.md). Original game source is under the [MIT License](../LICENSE).
