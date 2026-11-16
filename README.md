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
4. In **Silo**, spend 150 REFINED SPICE to expand capacity from 900 to 1,600. Open the wardrobe at **Command** to equip Duskwear.

The server stores the profile, mission, outfit and production state in `data/frontier.sqlite`. The browser keeps the guest session in an HTTP-only cookie. Return using the same browser profile and origin. Clearing the cookie removes access to that save. The same database and browser session restore progress after a server restart.

Phaser renders both maps. Drag to pan and use the camera buttons to zoom or reset. The location buttons provide a keyboard route to each building. The server controls production timestamps and commits inventory changes with a matching SQLite ledger entry. A finished batch waits in the refinery if the silo lacks space.

Use `npm run build` to create `dist/` and `npm start` to serve an existing build. The server listens on loopback. See `.env.example` for the port, database path and origin settings.

## Verification

```sh
npx playwright install chromium
npm test
npm run check:secrets
```

Set `NKS_BROWSER_CHANNEL=chrome` to use installed Chrome. The browser test covers the complete mission without a wallet. The economy test covers session isolation, duplicate orders, full silo handling, inventory reconciliation and wardrobe authorization. Set `NKS_FRONTIER_REAL_TIME=1` to use the real CLI and production time intervals. Set `NKS_FRONTIER_SCREENSHOTS=test-results/frontier` to capture the browser flow.

The [earlier wallet prototype](docs/WALLET-PROTOTYPE.md) is available through its own entry point. Frontier saves live in a separate SQLite file and create no on-chain reward authorizations. Use distinct ports when running both servers.

See the [design handoff](docs/HANDOFF.md), [test token parameters](TOKENOMICS.md) and [asset terms](ASSETS_LICENSE.md).
