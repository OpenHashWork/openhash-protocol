# Tokenomics

This document describes the role of a protocol token in principle. It states no supply, allocation, price or return, because none has been decided. Numbers will be added only once they are final and public.

## Purpose of a token

A token, if issued, exists to align the people who keep the protocol healthy: the parties who maintain adapters, review risk tiers and take part in governance. It is not a promise of income.

## Roles

- **Governance.** Holders can propose and vote on parameter changes, venue tiers and adapter upgrades, subject to the delay described in the whitepaper.
- **Backstop participation.** Holders may opt to commit tokens as a first-loss buffer for adapter failures, in return for a share of fees. Commitment is voluntary and carries real loss risk.
- **Access to curation.** Curators who propose strategies for shared use may be required to commit tokens, which can be reduced if a strategy breaks its stated rules.

## Fee flow

Protocol fees come from routing, not from rate reads. Reads stay free so that other programs can depend on them.

1. A small share of routed yield is taken as a fee.
2. The fee is split between the backstop, maintenance of adapters, and a reserve.
3. Split ratios are undecided and will be fixed through governance before any launch.

## What is deliberately absent

- No guaranteed yield for holders.
- No fee on simply reading a rate.
- No privileged key that can mint or redirect fees outside the published split.

## Open parameters

Total supply, distribution, vesting, fee rate, split ratios and backstop terms are all undecided. This file will change when they are.
