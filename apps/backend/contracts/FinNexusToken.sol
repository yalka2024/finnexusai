// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FinNexusToken (NEXUS)
 * @dev ERC20 token for FinNexusAI platform with advanced features
 * @author FinNexusAI Development Team
 * @notice This contract implements the NEXUS token with staking, governance, and utility features
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FinNexusToken is 
    ERC20, 
    ERC20Burnable, 
    ERC20Pausable, 
    ERC20Capped, 
    Ownable, 
    ReentrancyGuard 
{
    using SafeMath for uint256;

    // Token configuration
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10**18; // 10 billion tokens max
    uint256 public constant STAKING_REWARD_RATE = 10; // 10% annual reward rate
    uint256 public constant MIN_STAKE_AMOUNT = 1000 * 10**18; // Minimum 1000 tokens to stake
    uint256 public constant STAKING_LOCK_PERIOD = 30 days; // 30 days lock period

    // Staking structures
    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 lockUntil;
        uint256 rewardRate;
        bool isActive;
    }

    struct PoolInfo {
        uint256 totalStaked;
        uint256 rewardRate;
        uint256 lastUpdateTime;
        uint256 accRewardPerShare;
        bool isActive;
    }

    // State variables
    mapping(address => StakeInfo) public stakes;
    mapping(address => uint256) public pendingRewards;
    mapping(uint256 => PoolInfo) public stakingPools;
    
    uint256 public totalStaked;
    uint256 public currentPoolId;
    uint256 public totalRewardsDistributed;
    
    // Events
    event TokensStaked(address indexed user, uint256 amount, uint256 poolId, uint256 lockUntil);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardsClaimed(address indexed user, uint256 amount);
    event PoolCreated(uint256 indexed poolId, uint256 rewardRate);
    event PoolUpdated(uint256 indexed poolId, uint256 newRewardRate);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    // Modifiers
    modifier validStakeAmount(uint256 amount) {
        require(amount >= MIN_STAKE_AMOUNT, "Stake amount below minimum");
        _;
    }

    modifier stakeExists(address user) {
        require(stakes[user].isActive, "No active stake found");
        _;
    }

    modifier stakeUnlocked(address user) {
        require(block.timestamp >= stakes[user].lockUntil, "Stake is still locked");
        _;
    }

    modifier validPool(uint256 poolId) {
        require(poolId <= currentPoolId, "Invalid pool ID");
        require(stakingPools[poolId].isActive, "Pool is not active");
        _;
    }

    constructor() 
        ERC20("FinNexus Token", "NEXUS") 
        ERC20Capped(MAX_SUPPLY)
    {
        // Mint initial supply to owner
        _mint(msg.sender, INITIAL_SUPPLY);
        
        // Create initial staking pool
        _createStakingPool(STAKING_REWARD_RATE);
    }

    /**
     * @dev Create a new staking pool
     * @param rewardRate Annual reward rate in basis points (100 = 1%)
     */
    function createStakingPool(uint256 rewardRate) external onlyOwner {
        _createStakingPool(rewardRate);
    }

    function _createStakingPool(uint256 rewardRate) internal {
        currentPoolId++;
        stakingPools[currentPoolId] = PoolInfo({
            totalStaked: 0,
            rewardRate: rewardRate,
            lastUpdateTime: block.timestamp,
            accRewardPerShare: 0,
            isActive: true
        });
        
        emit PoolCreated(currentPoolId, rewardRate);
    }

    /**
     * @dev Stake tokens in the specified pool
     * @param amount Amount of tokens to stake
     * @param poolId Pool ID to stake in
     */
    function stake(uint256 amount, uint256 poolId) 
        external 
        nonReentrant 
        validStakeAmount(amount) 
        validPool(poolId)
    {
        require(!stakes[msg.sender].isActive, "Already has active stake");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Calculate lock period
        uint256 lockUntil = block.timestamp.add(STAKING_LOCK_PERIOD);
        
        // Create stake
        stakes[msg.sender] = StakeInfo({
            amount: amount,
            stakedAt: block.timestamp,
            lockUntil: lockUntil,
            rewardRate: stakingPools[poolId].rewardRate,
            isActive: true
        });
        
        // Update pool totals
        stakingPools[poolId].totalStaked = stakingPools[poolId].totalStaked.add(amount);
        totalStaked = totalStaked.add(amount);
        
        emit TokensStaked(msg.sender, amount, poolId, lockUntil);
    }

    /**
     * @dev Unstake tokens and claim rewards
     */
    function unstake() external nonReentrant stakeExists(msg.sender) stakeUnlocked(msg.sender) {
        StakeInfo storage userStake = stakes[msg.sender];
        
        // Calculate rewards
        uint256 reward = _calculateRewards(msg.sender);
        uint256 totalAmount = userStake.amount.add(reward);
        
        // Update totals
        totalStaked = totalStaked.sub(userStake.amount);
        totalRewardsDistributed = totalRewardsDistributed.add(reward);
        
        // Reset stake
        userStake.isActive = false;
        userStake.amount = 0;
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, totalAmount);
        
        emit TokensUnstaked(msg.sender, userStake.amount, reward);
    }

    /**
     * @dev Claim pending rewards without unstaking
     */
    function claimRewards() external nonReentrant stakeExists(msg.sender) {
        uint256 reward = _calculateRewards(msg.sender);
        require(reward > 0, "No rewards to claim");
        
        // Update stake timestamp
        stakes[msg.sender].stakedAt = block.timestamp;
        
        // Update totals
        totalRewardsDistributed = totalRewardsDistributed.add(reward);
        
        // Transfer rewards
        _transfer(address(this), msg.sender, reward);
        
        emit RewardsClaimed(msg.sender, reward);
    }

    /**
     * @dev Calculate pending rewards for a user
     * @param user User address
     * @return reward amount
     */
    function _calculateRewards(address user) internal view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        if (!userStake.isActive) return 0;
        
        uint256 stakingDuration = block.timestamp.sub(userStake.stakedAt);
        uint256 annualReward = userStake.amount.mul(userStake.rewardRate).div(10000);
        uint256 reward = annualReward.mul(stakingDuration).div(365 days);
        
        return reward;
    }

    /**
     * @dev Get pending rewards for a user
     * @param user User address
     * @return reward amount
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return _calculateRewards(user);
    }

    /**
     * @dev Get stake information for a user
     * @param user User address
     * @return stake information
     */
    function getStakeInfo(address user) external view returns (StakeInfo memory) {
        return stakes[user];
    }

    /**
     * @dev Get pool information
     * @param poolId Pool ID
     * @return pool information
     */
    function getPoolInfo(uint256 poolId) external view returns (PoolInfo memory) {
        return stakingPools[poolId];
    }

    /**
     * @dev Update pool reward rate
     * @param poolId Pool ID
     * @param newRewardRate New reward rate
     */
    function updatePoolRewardRate(uint256 poolId, uint256 newRewardRate) external onlyOwner validPool(poolId) {
        stakingPools[poolId].rewardRate = newRewardRate;
        emit PoolUpdated(poolId, newRewardRate);
    }

    /**
     * @dev Emergency withdraw for locked stakes (owner only)
     * @param user User address
     */
    function emergencyWithdraw(address user) external onlyOwner stakeExists(user) {
        StakeInfo storage userStake = stakes[user];
        uint256 amount = userStake.amount;
        
        // Update totals
        totalStaked = totalStaked.sub(amount);
        
        // Reset stake
        userStake.isActive = false;
        userStake.amount = 0;
        
        // Transfer tokens back to user
        _transfer(address(this), user, amount);
        
        emit EmergencyWithdraw(user, amount);
    }

    /**
     * @dev Mint new tokens (owner only)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from a specific address (owner only)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    /**
     * @dev Pause token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override required by Solidity
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Override required by Solidity
     */
    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Capped) {
        super._mint(to, amount);
    }

    /**
     * @dev Get total supply including staked tokens
     * @return total supply
     */
    function getTotalSupply() external view returns (uint256) {
        return totalSupply();
    }

    /**
     * @dev Get circulating supply (total supply minus staked tokens)
     * @return circulating supply
     */
    function getCirculatingSupply() external view returns (uint256) {
        return totalSupply().sub(totalStaked);
    }

    /**
     * @dev Get staking statistics
     * @return total staked, total rewards distributed, number of active stakers
     */
    function getStakingStats() external view returns (uint256, uint256, uint256) {
        // This would require additional tracking for active stakers
        // For now, return available data
        return (totalStaked, totalRewardsDistributed, 0);
    }
}
