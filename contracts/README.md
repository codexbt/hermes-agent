# Contracts scaffold

This folder contains a minimal Hardhat scaffold and Solidity contracts for the Kairos token, fee splitter, reward distributor, and staking contract.

Files:
- `HerToken.sol` — ERC20 token with owner mint.
- `FeeSplitter.sol` — collects fees and splits into buckets.
- `RewardDistributor.sol` — owner-driven distribution based on oracle/backend results.
- `Staking.sol` — minimal staking contract to lock tokens for multipliers.

To install dependencies and run tests (if any):

```bash
cd contracts
npm install
npx hardhat compile
```

This scaffold is a starting point; do not use in production without audits, access control, and gas optimizations.
