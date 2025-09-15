// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PoTToken (Proof of Trust Token)
 * @dev ERC20 token representing trust and reputation in the FinNexus AI platform
 */
contract PoTToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard {

    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // Token configuration
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    uint256 public totalMinted;
    uint256 public totalBurned;
    
    // Trust scoring system
    struct TrustScore {
        uint256 score; // 0-1000 (1000 = maximum trust)
        uint256 lastUpdated;
        string reason;
    }
    
    mapping(address => TrustScore) public trustScores;
    mapping(address => bool) public isWhitelisted;
    
    // Reward categories
    enum RewardCategory {
        TRADING_PERFORMANCE,    // 1.0x multiplier
        COMPLIANCE_SCORE,       // 1.2x multiplier
        COMMUNITY_CONTRIBUTION, // 1.5x multiplier
        PLATFORM_LOYALTY,      // 2.0x multiplier
        SPECIAL_ACHIEVEMENT    // 3.0x multiplier
    }
    
    mapping(RewardCategory => uint256) public rewardMultipliers;
    
    // Events
    event TrustScoreUpdated(address indexed user, uint256 newScore, string reason);
    event RewardMinted(address indexed user, uint256 amount, RewardCategory category, string reason, uint256 trustScore);
    event PenaltyApplied(address indexed user, uint256 amount, string reason);
    
    constructor() ERC20("Proof of Trust Token", "POT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        
        rewardMultipliers[RewardCategory.TRADING_PERFORMANCE] = 100;
        rewardMultipliers[RewardCategory.COMPLIANCE_SCORE] = 120;
        rewardMultipliers[RewardCategory.COMMUNITY_CONTRIBUTION] = 150;
        rewardMultipliers[RewardCategory.PLATFORM_LOYALTY] = 200;
        rewardMultipliers[RewardCategory.SPECIAL_ACHIEVEMENT] = 300;
    }

    function mintReward(address to, uint256 baseAmount, RewardCategory category, string memory reason) external {
        require(hasRole(MINTER_ROLE, msg.sender), "PoTToken: must have minter role");
        require(to != address(0), "PoTToken: cannot mint to zero address");
        require(baseAmount > 0, "PoTToken: amount must be greater than 0");
        
        uint256 multiplier = rewardMultipliers[category];
        uint256 trustScore = trustScores[to].score;
        uint256 trustBonus = (multiplier * trustScore) / 10000;
        uint256 finalMultiplier = multiplier + trustBonus;
        uint256 finalAmount = (baseAmount * finalMultiplier) / 100;
        
        require(totalMinted + finalAmount <= MAX_SUPPLY, "PoTToken: would exceed max supply");
        
        totalMinted += finalAmount;
        _mint(to, finalAmount);
        
        emit RewardMinted(to, finalAmount, category, reason, trustScore);
    }

    function applyPenalty(address from, uint256 amount, string memory reason) external {
        require(hasRole(BURNER_ROLE, msg.sender), "PoTToken: must have burner role");
        require(from != address(0), "PoTToken: cannot burn from zero address");
        require(amount > 0, "PoTToken: amount must be greater than 0");
        require(balanceOf(from) >= amount, "PoTToken: insufficient balance for penalty");
        
        totalBurned += amount;
        _burn(from, amount);
        
        emit PenaltyApplied(from, amount, reason);
    }

    function updateTrustScore(address user, uint256 newScore, string memory reason) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "PoTToken: must have admin role");
        require(user != address(0), "PoTToken: user cannot be zero address");
        require(newScore <= 1000, "PoTToken: trust score cannot exceed 1000");
        
        trustScores[user] = TrustScore({
            score: newScore,
            lastUpdated: block.timestamp,
            reason: reason
        });
        
        emit TrustScoreUpdated(user, newScore, reason);
    }

    function pause() external {
        require(hasRole(PAUSER_ROLE, msg.sender), "PoTToken: must have pauser role");
        _pause();
    }

    function unpause() external {
        require(hasRole(PAUSER_ROLE, msg.sender), "PoTToken: must have pauser role");
        _unpause();
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}