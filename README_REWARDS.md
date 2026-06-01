# Token Rewards: Top-20 Holders vs Developers — Mechanic Design

This document describes a reward system that creates a recurring "race" between the top 20 token holders and active developers who submit quality pull requests (PRs). It contains the rules, distribution formulas, thresholds, and recommended on-chain / hybrid implementation approach.

---

## Goals
- Create strong incentives for on-chain holders and active project contributors.
- Direct protocol fees to either top holders or developers depending on contribution outcomes.
- Encourage sustained development: high-quality PRs earn direct rewards (and reduce passive holder payouts).
- Maintain economic balance and anti-abuse measures.

## High-level Rules
- Initial total supply: 1,000,000,000 tokens (1B).
- Every purchase (or platform fee event) collects a `platform fee` percentage (example: 5% of purchase value).
- Fees collected during a 24-hour cycle form the daily Reward Pool.
- If at least one approved, high-quality PR is merged into the canonical repo during that 24-hour cycle, a significant portion of the Reward Pool is allocated to the developer(s) who submitted the accepted PR(s). If no qualifying PRs are merged that day, the Reward Pool is distributed to the current top 20 holders.

## Example Fee Split (configurable)
- Purchase fee: 5%.
  - 50% → Reward Pool (distributable each 24h)
  - 20% → Liquidity
  - 15% → Treasury / ops
  - 10% → Buyback & Burn
  - 5% → Marketing / referrals

From that Reward Pool, distribution for the 24-hour cycle follows the race rules described below.

## Race Mechanics & Distribution
1. At daily cutoff (UTC 00:00 or configurable), compute the Reward Pool amount for the previous 24h.
2. Query the contribution oracle (trusted service) to determine which PRs were merged and flagged as qualifying that day.
3. Two outcomes:
   - A. At least one qualifying PR merged: allocate the Reward Pool primarily to the PR submitter(s).
     - Suggested split: 70% → qualifying developer(s); 30% → Top-20 holders (pro rata by stake) as ongoing incentive.
     - If multiple qualifying PRs were merged, split the developer portion proportional to a quality score (lines changed, reviewer rating, test coverage, reviewer approvals, complexity), or equally if simple.
   - B. No qualifying PRs merged: allocate 100% → Top-20 holders (pro rata by stake among top-20).

## Top-20 Holder Eligibility & Dynamic Thresholds
- To encourage meaningful holdings and limit gaming, define minimum holding requirements for the top-20 reward slot. Example thresholds tied to market cap milestones:
  - Base rule at fair launch: to be considered in the `Top-20` reward list, an address must hold at least `1,000,000` tokens OR be one of the top-20 by balance (whichever is stricter). This prevents micro-balances from gaming the top-20 list.
  - As market cap increases, raise the per-holder minimum to keep the program meaningful. For example:
    - Market cap < $1M: min hold 100k tokens
    - Market cap $1M–$5M: min hold 500k tokens
    - Market cap $5M+: min hold 1,000,000 tokens
- If fewer than 20 holders meet the minimum, fill remaining slots with the next largest holders until 20 slots are filled.

## PR Qualification Rules (example)
- PR must be merged into `main` (or canonical branch) during the 24-hour cycle.
- PR must pass CI and be approved by at least one core maintainer/reviewer.
- PR should implement meaningful feature, fix, or optimization. Small editorial changes or formatting-only PRs should be excluded or lower-weighted.
- A maintainer multisig or automated scoring pipeline assigns a `quality_score` used to weight splits across multiple PRs.

## Reward Calculation (example formulas)
- When PRs exist:
  - developer_pool = reward_pool * developer_split_pct (e.g., 0.70)
  - holder_pool = reward_pool - developer_pool
  - For each developer: dev_reward = developer_pool * (quality_score_dev / sum(quality_scores))
  - For each top-20 holder: holder_reward = holder_pool * (holder_balance / sum(top20_balances))
- When no PRs: every top-20 holder receives: holder_reward = reward_pool * (holder_balance / sum(top20_balances))

## Ongoing Rewards for Continued Contribution
- If a developer submits a high-quality PR and continues to contribute (multiple days), you can split rewards between the developer and top holders for a transition window (example: 7 days) — this maintains holder incentives while rewarding ongoing contributors.

## Staking Boosts & Vesting
- Allow developers and/or holders to stake tokens for a reward multiplier. Example: stake for 30 days → 1.15x reward multiplier; 90 days → 1.5x.
- Large developer payouts should be subject to vesting (linear over 30–180 days) to prevent immediate sell pressure.

## Anti-Abuse & Safety
- Require CI, maintainer approval, and automated checks for PR eligibility.
- Cap daily developer payouts as a percent of daily pool (e.g., max 90%) to avoid all-or-nothing catastrophic shifts.
- Monitor for sybil attacks where the same entity controls many contributor accounts; require GitHub-linked identities or higher trust thresholds for large payouts.
- For significant token sales or presale participants, apply vesting and KYC as needed.

## On-Chain vs Hybrid Implementation
- On-Chain (fully trustless):
  - Implement an ERC-20 token plus on-chain `RewardDistributor` and `Staking` contracts.
  - Use an oracle/oracle-signer (multisig or Gnosis Safe) to submit daily contribution results (merged PR IDs + quality scores) to the `RewardDistributor` which executes token transfers to developer addresses and holders.
  - Pros: transparent, auditable. Cons: gas costs, more expensive for frequent distributions.

- Hybrid (recommended for rapid prototyping / lower gas costs):
  - Record purchases and fees on-chain or via the backend payment processor; hold reward tokens in a protocol wallet controlled by a multisig.
  - Use a backend service to verify PR merges (GitHub webhooks + CI pass + reviewer approvals) and compute daily allocations.
  - Periodically (daily or weekly) the multisig triggers on-chain distributions to developer addresses and top-20 holders, or mints tokens via a controlled minter role.
  - Pros: cheaper, flexible; faster to iterate.

## Contracts / Components Needed
- Token contract (ERC-20) — total supply 1B, minter/burner roles if hybrid minting used.
- FeeSplitter contract — splits fee fractions (Reward Pool, liquidity, treasury, buyback, marketing) automatically on purchase.
- RewardDistributor contract — holds/distributes tokens per daily outcome, accepts oracle input.
- Staking contract — lock tokens for multipliers and track staked balances.
- Backend service / oracle: verify PR merges, compute quality scores, submit signed reports to `RewardDistributor` or to multisig.

## Example Daily Flow (hybrid)
1. Purchases occur during the day → fees accumulate in Fee Pool.
2. At cutoff, backend aggregates fees → calculates Reward Pool.
3. Backend verifies merged PRs via GitHub API and CI results → computes quality scores.
4. If developers qualify, backend composes distribution and asks multisig to execute transfers; otherwise multisig distributes to top-20 holders.

## Example Scenarios
- Scenario A — Good dev day: Reward Pool = 10,000 tokens. One high-quality PR merged with score 100. Developer gets 7,000; top-20 split 3,000.
- Scenario B — Quiet day: Reward Pool = 5,000 tokens. No PRs merged. Top-20 split 5,000 proportionally.

## Metrics to Track
- Daily Reward Pool size
- Number of qualifying PRs and total `quality_score`
- Top-20 balances and share
- Developer payout amounts and vesting schedule
- Token velocity and market cap

## README Copy to Add to Project `README.md`
Include a short summary and link to this file. Suggested paragraph:

"We run a daily on-chain/hybrid reward competition between the top 20 token holders and active contributors. Platform fees form a daily Reward Pool — if qualifying PRs are merged that day, developers earn the lion's share; otherwise the top 20 holders share the pool. Token supply is 1B; thresholds, splits, and vesting rules are configurable and described in README_REWARDS.md. This mechanism aligns long-term holders and builders while rewarding real, verified contributions."

---

## Next steps (implementable tasks)
1. Finalize numeric thresholds (fee%, developer split, staking multipliers).
2. Implement GitHub webhook + backend scorer to verify PRs and compute quality_score.
3. Implement `RewardDistributor` (Solidity) with oracle input or a multisig-based distribution CLI script.
4. Implement staking & vesting contracts.
5. Build dashboard showing daily pools, top-20, and recent qualifying PRs.

If you want, I can: (A) propose exact numeric tokenomics, (B) scaffold a Solidity `RewardDistributor` contract, or (C) scaffold the backend GitHub verification + distribution script. Tell me which and I'll implement.
