# Architecture

## Overview

Ratepad is a small set of Solana programs plus offchain tooling that only reads and displays state. Nothing offchain is required for correctness.

```
 venues ──> adapters ──> rate program ──> reference rate account
                                              │
 depositor ──> router program <───────────────┘
                   │
                   └──> venue deposits / withdrawals
```

## Programs

### Rate program

Holds one reference rate account per asset. On each update it reads the registered adapters' outputs, applies liquidity and tier weights, trims outliers, and writes the result with the inputs that produced it.

### Adapter programs

One per venue, each narrow: read the venue's accounts, return supply rate, borrow rate and utilisation in a common format. Adapters never move funds.

### Router program

Holds positions. Given a strategy and current reference data, it computes target weights and, when the improvement clears the rebalance threshold, performs deposits and withdrawals through the venue's own interface.

## Accounts

| Account | Contents |
| --- | --- |
| Asset | Mint, supported venues, current reference rate |
| Venue | Adapter address, risk tier, exposure cap |
| Strategy | Permitted venues, per-venue caps, rebalance threshold |
| Position | Owner, strategy, balances per venue |
| Parameters | Trimming rule, tier caps, delay settings |

## Data flow

1. A keeper triggers a rate update. Anyone may be a keeper.
2. The rate program reads adapter outputs and writes a new reference rate.
3. A keeper triggers a rebalance for a position. The router checks the strategy, the reference rate and withdrawable liquidity.
4. If the checks pass, funds move and the position account records the result.

## Trust model

- Reading is permissionless.
- Keepers can trigger updates but cannot choose their content.
- Parameter changes pass through a delay and are visible onchain before they apply.
- Upgrade authority is subject to the same delay.

## Failure handling

- A failing adapter is excluded from the round and flagged; the reference rate is computed from the rest.
- If too few adapters respond, the rate is marked stale and the router will not rebalance on it.
- Withdrawals never depend on the rate program being healthy.

## Testing

- Simulator replays of venue behaviour for aggregation and routing.
- Property tests on weight calculation: weights sum to one, caps are respected, no venue exceeds its tier.
- Fault injection for adapter failure, stale data and thin liquidity.
