# Ratepad

Onchain rate discovery and yield routing on Solana.

Ratepad publishes a transparent, verifiable rate for lending and borrowing markets, then routes deposits toward the best available yield under rules the depositor chooses. Rates are derived from onchain activity, not from a single operator's quote.

## What it does

- **Rate discovery.** Aggregates borrow and supply conditions across Solana lending venues into a single reference rate per asset, computed onchain and readable by any program.
- **Yield routing.** Splits a deposit across venues according to a strategy: highest rate, lowest risk tier, or a weighted mix. Rebalancing follows published rules.
- **Open reads.** Every rate, weight and route decision is an account anyone can read and verify.

## Repository layout

| Path | Purpose |
| --- | --- |
| `docs/whitepaper.md` | Protocol design and rationale |
| `docs/architecture.md` | Accounts, programs and data flow |
| `docs/tokenomics.md` | Token role and fee flow, in principle |
| `docs/roadmap.md` | Delivery phases |
| `.github/CONTRIBUTING.md` | How to contribute |
| `.github/SECURITY.md` | How to report a vulnerability |

## Status

Design stage. Parameters that are not yet decided are marked as undecided in the documents rather than guessed.

## Contributing

Read `.github/CONTRIBUTING.md` first. Security issues go through the process in `.github/SECURITY.md`, never a public issue.

## License

MIT. See `LICENSE`.
