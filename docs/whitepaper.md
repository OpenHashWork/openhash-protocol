# Ratepad Whitepaper

## Abstract

Lending rates on Solana are scattered across venues, each with its own utilisation curve, risk model and update cadence. A depositor who wants the best return must watch every venue, and a protocol that needs a reference rate has no neutral source. Ratepad provides one: an onchain reference rate per asset, and a router that moves deposits according to it.

## Problem

1. **Fragmented rates.** The same asset earns different returns on different venues, and the gap changes with every block.
2. **No neutral reference.** Programs that need a rate either trust an offchain feed or copy one venue, inheriting its quirks.
3. **Manual routing.** Moving funds between venues costs attention and fees, so most capital stays where it first landed.

## Design goals

- **Verifiable.** Any input to a rate is an account that can be read.
- **Composable.** Other programs can read a rate with a single account fetch.
- **Bounded risk.** Routing respects caps and tiers set by the depositor and by the protocol.
- **Minimal trust.** No single key can change a published rate.

## Rate discovery

For each supported asset and venue, an adapter reads the venue's supply rate, borrow rate and utilisation. The reference rate is a weighted aggregate. Weights depend on available liquidity and on a venue's risk tier, so a thin or high-risk venue cannot drag the reference rate.

Outliers are handled by trimming: a venue whose rate departs sharply from the weighted median is excluded from that round and flagged. The exact trimming rule is a parameter still to be fixed after simulation.

## Yield routing

A depositor selects a strategy. The router computes target weights from current reference data and the strategy's constraints, then moves funds only when the expected improvement exceeds the cost of moving. This hysteresis prevents churn.

Strategies are plain accounts. A strategy lists permitted venues, per-venue caps and a rebalance threshold. Depositors can use a shared strategy or define their own.

## Risk

- **Venue risk.** Each venue carries a tier. Tiers cap exposure and can be tightened quickly but loosened only slowly.
- **Oracle and adapter risk.** Adapters are narrow, audited and replaceable through a delayed upgrade path.
- **Liquidity risk.** The router checks withdrawable liquidity before assigning weight.
- **Smart contract risk.** Programs are kept small. See the architecture document for the account model.

## Governance

Protocol parameters change through a delayed, publicly visible process. Any change is announced onchain before it can take effect, so depositors can exit first.

## Limitations

Reference rates describe the past and present, not a promise. Routing reduces effort; it does not remove market risk. Parameters marked undecided in these documents will be set through simulation and review.
