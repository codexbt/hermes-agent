// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HerToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * RewardDistributor (oracle-driven): owner (multisig) submits daily report specifying
 * whether there are qualifying PRs and the developer recipients and amounts. The contract
 * then distributes reward tokens to developers and top holders (addresses list must be provided).
 * This is a simple scaffold — in production use, tighten access control and consider gas costs.
 */
contract RewardDistributor is Ownable {
    HerToken public token;

    event Distributed(uint256 indexed day, bool devsPaid, uint256 totalAmount);

    constructor(HerToken _token) {
        token = _token;
    }

    // owner must transfer tokens to this contract before distribution
    // dayKey: e.g., block.timestamp / 1 days or an incrementing day index
    // devRecipients and devAmounts must align; topHolders and holderAmounts must align
    function distribute(uint256 dayKey, address[] calldata devRecipients, uint256[] calldata devAmounts, address[] calldata topHolders, uint256[] calldata holderAmounts) external onlyOwner {
        uint256 total = token.balanceOf(address(this));
        require(total > 0, "no tokens to distribute");

        uint256 sent = 0;

        if (devRecipients.length > 0) {
            for (uint i=0;i<devRecipients.length;i++){
                require(devRecipients[i] != address(0), "invalid dev recipient");
                token.transfer(devRecipients[i], devAmounts[i]);
                sent += devAmounts[i];
            }
        }

        if (topHolders.length > 0) {
            for (uint j=0;j<topHolders.length;j++){
                require(topHolders[j] != address(0), "invalid holder");
                token.transfer(topHolders[j], holderAmounts[j]);
                sent += holderAmounts[j];
            }
        }

        emit Distributed(dayKey, devRecipients.length>0, sent);
    }
}
