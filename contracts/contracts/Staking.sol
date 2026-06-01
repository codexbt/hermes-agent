// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HerToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Very simple staking contract: users lock tokens for a period to increase their reward multiplier.
 * This scaffold records stake balances and unlock times. It does not auto-distribute rewards.
 */
contract Staking is Ownable {
    HerToken public token;

    struct Stake { uint256 amount; uint256 unlockAt; }

    mapping(address=>Stake) public stakes;

    constructor(HerToken _token) {
        token = _token;
    }

    function stake(uint256 amount, uint256 lockSeconds) external {
        require(amount>0, "zero");
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        stakes[msg.sender].amount += amount;
        uint256 newUnlock = block.timestamp + lockSeconds;
        if (newUnlock > stakes[msg.sender].unlockAt) stakes[msg.sender].unlockAt = newUnlock;
    }

    function withdraw() external {
        Stake storage s = stakes[msg.sender];
        require(s.amount>0, "no stake");
        require(block.timestamp >= s.unlockAt, "locked");
        uint256 amt = s.amount;
        s.amount = 0;
        s.unlockAt = 0;
        token.transfer(msg.sender, amt);
    }

    function stakedBalance(address who) external view returns (uint256) {
        return stakes[who].amount;
    }
}
