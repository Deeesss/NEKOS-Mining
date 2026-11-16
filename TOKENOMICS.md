# NEKOS SPICE prototype parameters

| Parameter | Test value |
| --- | --- |
| Network | Base Sepolia (84532) or isolated local Anvil (31337) |
| Token name and symbol | NEKOS SPICE (NKS) |
| Standard | ERC-20, 18 decimals |
| Supply at deployment | 100,000 NKS |
| Distributor funding | 100% of test supply |
| Mining | One active 60-second shift per wallet, 60 internal spice points on completion |
| Conversion | 1 spice point converts to 0.01 test NKS |
| Claim validity | 10 minutes from the latest chain timestamp at issuance |
| Gas | ETH on the test network, paid by the claimant |

Spice points are server-side game progress. NKS is the transferable test token received after claiming on-chain. The contract has no post-deployment mint. The distribution pool and single-use signed claims limit payouts. The test rules allow multiple wallets per person.

Production supply, issuance, reward rates, anti-abuse rules, sale, liquidity and economic design remain undecided.

## Frontier Market test

The local Frontier market charges 1 test NKS for Duskwear. The token transfer goes to the configured development treasury. A signed order is specific to the buyer, the chain, the market and the guest colony's purchase. The outfit becomes available after the contract records payment. REFINED SPICE remains a city resource and has no automatic conversion to NKS.
