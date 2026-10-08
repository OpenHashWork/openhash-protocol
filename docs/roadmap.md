# Roadmap

Phases are ordered by dependency, not by calendar. A phase is finished when its exit criteria are met and reviewed.

## Phase one: foundations

- Define the account model for rates, venues, strategies and positions.
- Write the adapter interface and a reference adapter.
- Build a simulator that replays venue behaviour to test aggregation and trimming rules.

**Exit:** the simulator reproduces known venue behaviour, and the trimming rule is fixed.

## Phase two: rate discovery

- Ship the reference rate program for a small set of assets.
- Add adapters for the first venues, each with a risk tier.
- Publish a public rate reader and example integrations.

**Exit:** rates are readable onchain, verifiable against venue accounts, and reviewed independently.

## Phase three: routing

- Ship the router with caps, tiers and rebalance thresholds.
- Add shared strategies and user-defined strategies.
- Add withdrawal-liquidity checks.

**Exit:** routing behaves as specified under simulated stress, and an external review has no open critical findings.

## Phase four: governance

- Introduce delayed, publicly visible parameter changes.
- Define the process for adding venues and changing tiers.

**Exit:** a parameter change can be proposed, delayed, announced and applied end to end.

## Phase five: breadth

- Support more assets and venues.
- Improve tooling for curators and integrators.

## Not planned

Custody of user funds by any single key, and any change that bypasses the announcement delay.
