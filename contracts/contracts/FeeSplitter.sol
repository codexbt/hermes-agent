// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HerToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * FeeSplitter: receives fee in token and records portions for different buckets.
 * The contract holds tokens until a multisig or owner triggers distribution.
 */
contract FeeSplitter is Ownable {
    HerToken public token;

    uint256 public rewardPct; // e.g., 50 -> 50%
    uint256 public liquidityPct;
    uint256 public treasuryPct;
    uint256 public buybackPct;
    uint256 public marketingPct;

    constructor(HerToken _token) {
        token = _token;
        rewardPct = 50;
        liquidityPct = 20;
        treasuryPct = 15;
        buybackPct = 10;
        marketingPct = 5;
    }

    function setPercents(uint256 _reward, uint256 _liquidity, uint256 _treasury, uint256 _buyback, uint256 _marketing) external onlyOwner {
        require(_reward + _liquidity + _treasury + _buyback + _marketing == 100, "total must be 100");
        rewardPct = _reward;
        liquidityPct = _liquidity;
        treasuryPct = _treasury;
        buybackPct = _buyback;
        marketingPct = _marketing;
    }

    function receiveFees(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        // funds stay in contract until distribution
    }

    function viewBuckets() external view returns (uint256 rewardBucket, uint256 liquidityBucket, uint256 treasuryBucket, uint256 buybackBucket, uint256 marketingBucket) {
        uint256 bal = token.balanceOf(address(this));
        rewardBucket = bal * rewardPct / 100;
        liquidityBucket = bal * liquidityPct / 100;
        treasuryBucket = bal * treasuryPct / 100;
        buybackBucket = bal * buybackPct / 100;
        marketingBucket = bal * marketingPct / 100;
    }

    // Owner triggers distribution; in practice multisig should be owner
    function distribute(address rewardReceiver, address liquidityReceiver, address treasuryReceiver, address buybackReceiver, address marketingReceiver) external onlyOwner {
        (uint256 r, uint256 l, uint256 t, uint256 b, uint256 m) = viewBuckets();
        if (r>0) token.transfer(rewardReceiver, r);
        if (l>0) token.transfer(liquidityReceiver, l);
        if (t>0) token.transfer(treasuryReceiver, t);
        if (b>0) token.transfer(buybackReceiver, b);
        if (m>0) token.transfer(marketingReceiver, m);
    }
}
