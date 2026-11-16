# NEKOS: Spice Frontier

Lead Emberwell, a mining colony at the edge of the Glass Basin. Choose a steward, dispatch a harvester, refine SPICE and invest the reserves in your colony.

## Play locally

Use Node.js 24+ and npm.

```sh
npm ci --ignore-scripts
npm run dev
```

Open http://127.0.0.1:3000. Choose a protagonist and name, then accept Commander Iona’s mission.

1. Open **Hangar → Open desert map** and **Dispatch harvester**. The expedition takes 28 seconds and brings back 1,000 RAW SPICE.
2. Open **Refinery → Start refining**. Processing takes 10 seconds. The batch adds 700 REFINED SPICE to the silo when there is room.
3. Return to **Command** and report the 500-unit delivery to Iona.
4. In **Silo**, spend 150 REFINED SPICE to expand capacity from 900 to 1,600. Open **Market → Open market** to preview Duskwear. Buy it with test NKS after the mission in the enabled checkout runtime, then equip it in the Market’s **Wardrobe**.

The server stores the profile, mission, outfit and production state in `data/frontier.sqlite`. The browser keeps the guest session in an HTTP-only cookie. Return using the same browser profile and origin. Clearing the cookie removes access to that save. The same database and browser session restore progress after a server restart.

Phaser renders both maps. Drag to pan and use the camera buttons to zoom or reset. The location buttons provide a keyboard route to each building. The server controls production timestamps and commits inventory changes with a matching SQLite ledger entry. A finished batch waits in the refinery if the silo lacks space.

Use `npm run build` to create `dist/` and `npm start` to serve an existing build. The server listens on loopback. See `.env.example` for the port, database path and origin settings.

## Frontier Relay

Finish The First Reserve to earn three signals. Later refinery deliveries earn one each. Open **Relay → Open relay** to preview the roster, spend one signal on a recruit and assign one specialist at a time.

- **Nim · S-rank featured** shortens each leg of a future expedition by two seconds.
- **Mira Vesper · S-rank standard** shortens future refinery batches from ten seconds to six.
- **Varren · A-rank** improves future refinery yield from 70% to 75%.

The prototype banner rolls a 10% base chance of S-rank, with S-rank guaranteed on the fifth pull since the last S-rank. An S-rank roll is 50/50 Nim or Mira. After a Mira result, the next S-rank is guaranteed Nim. Duplicate recruits give a fragment, and two fragments automatically make another signal. The save keeps the guarantee, collection and active assignment. Signals are earned through play.

## Local NKS checkout

Use npm run dev:market to start the same game with a local Anvil market. Import the local-only `playerKey` from data/market-local/market.json into a dedicated development wallet. It starts with 10 test NKS and development gas. Keep the file private and use that key only on the local development chain. The shop requests wallet access when the player clicks `Buy Duskwear`. The first purchase may request an allowance for the exact price and a second confirmation for the payment. Confirmed purchases cost 1 test NKS and leave the city’s SPICE untouched. Keep data/market-local and data/frontier.sqlite together for a restorable local environment.

The default npm run dev runs the full colony mission, upgrades, and outfit previews without a chain. For Base Sepolia checkout, supply an existing testnet market deployment using the `FRONTIER_MARKET` settings in `.env.example`. The server verifies token, treasury and signer and grants the item from the finalized buyer record. Base Sepolia deployment remains pending.

Existing saves keep previously earned outfits. The first load under the NKS rules returns SPICE previously charged for Duskwear. Any refund that cannot fit remains queued until the silo has space.

## Verification

```sh
npx playwright install chromium
npm test
npm run check:secrets
```

Set `NKS_BROWSER_CHANNEL=chrome` to use installed Chrome. The browser test covers the complete mission without a wallet, then pays real ERC-20 test NKS on Anvil with a development wallet adapter. It checks a rejected payment, a different payer, replay rejection and exact buyer and treasury balances. The economy test covers session isolation, duplicate orders, full silo handling, inventory reconciliation legacy refund reconciliation and wardrobe authorization. Set `NKS_FRONTIER_REAL_TIME=1` to use the real CLI and production time intervals. Set `NKS_FRONTIER_SCREENSHOTS=test-results/frontier` to capture the browser flow.

The [earlier wallet prototype](docs/WALLET-PROTOTYPE.md) is available through its own entry point. Frontier saves live in a separate SQLite file and create no on-chain reward authorizations. Use distinct ports when running both servers.

See the [design handoff](docs/HANDOFF.md), [test token parameters](TOKENOMICS.md) and [asset terms](ASSETS_LICENSE.md).
