// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DeFAIManager
 * @dev Main contract for managing DeFi AI operations in the FinNexus platform
 * @notice Handles portfolio management, yield optimization, and automated trading
 */
contract DeFAIManager is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Token contracts
    IERC20 public immutable nexusToken;
    IERC20 public immutable potToken;
    
    // Portfolio management
    struct Portfolio {
        address owner;
        uint256 totalValue;
        uint256 lastRebalance;
        bool isActive;
    }
    
    mapping(address => Portfolio) public portfolios;
    mapping(address => mapping(address => uint256)) public portfolioTokenBalances;
    mapping(address => address[]) public portfolioSupportedTokens;
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // Yield optimization
    struct YieldStrategy {
        address strategyContract;
        string name;
        bool isActive;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 currentAPY;
        uint256 totalDeposited;
    }
    
    mapping(uint256 => YieldStrategy) public yieldStrategies;
    uint256 private _strategyIdCounter;
    
    // User yield tracking
    mapping(address => uint256) public userYield;
    mapping(address => uint256[]) public userStrategies;
    
    // Risk management
    struct RiskProfile {
        uint256 riskScore; // 0-1000 (1000 = highest risk)
        uint256 maxLeverage;
        uint256 maxSinglePosition;
        bool isApproved;
    }
    
    mapping(address => RiskProfile) public riskProfiles;
    
    // Fee configuration
    uint256 public managementFeePercentage = 200; // 2% (200 basis points)
    uint256 public performanceFeePercentage = 1000; // 10% (1000 basis points)
    address public feeRecipient;
    
    // Events
    event PortfolioCreated(address indexed owner, uint256 initialValue);
    event PortfolioRebalanced(address indexed owner, uint256 newValue);
    event YieldOptimized(address indexed user, uint256 amount, uint256 strategyId);
    event StrategyAdded(uint256 indexed strategyId, address strategyContract, string name);
    event StrategyUpdated(uint256 indexed strategyId, bool isActive, uint256 newAPY);
    event RiskProfileUpdated(address indexed user, uint256 riskScore, bool isApproved);
    event FeesCollected(address indexed user, uint256 managementFee, uint256 performanceFee);
    event EmergencyWithdrawal(address indexed user, uint256 amount, string reason);
    
    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "DeFAIManager: must have admin role");
        _;
    }
    
    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "DeFAIManager: must have operator role");
        _;
    }
    
    modifier onlyStrategy() {
        require(hasRole(STRATEGY_ROLE, msg.sender), "DeFAIManager: must have strategy role");
        _;
    }
    
    modifier onlyEmergency() {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "DeFAIManager: must have emergency role");
        _;
    }
    
    modifier onlyPortfolioOwner(address user) {
        require(portfolios[user].owner == user, "DeFAIManager: not portfolio owner");
        _;
    }

    constructor(address _nexusToken, address _potToken, address _feeRecipient) {
        require(_nexusToken != address(0), "DeFAIManager: nexus token cannot be zero address");
        require(_potToken != address(0), "DeFAIManager: pot token cannot be zero address");
        require(_feeRecipient != address(0), "DeFAIManager: fee recipient cannot be zero address");
        
        nexusToken = IERC20(_nexusToken);
        potToken = IERC20(_potToken);
        feeRecipient = _feeRecipient;
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(STRATEGY_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        // Initialize strategy counter
        _strategyIdCounter = 1; // Start from 1
        
        // Add initial supported tokens
        supportedTokens[_nexusToken] = true;
        supportedTokens[_potToken] = true;
        tokenList.push(_nexusToken);
        tokenList.push(_potToken);
    }

    /**
     * @dev Create a new portfolio for a user
     * @param user Address of the user
     * @param initialValue Initial portfolio value
     */
    function createPortfolio(address user, uint256 initialValue) external onlyOperator {
        require(user != address(0), "DeFAIManager: user cannot be zero address");
        require(!portfolios[user].isActive, "DeFAIManager: portfolio already exists");
        require(initialValue > 0, "DeFAIManager: initial value must be greater than 0");
        
        portfolios[user] = Portfolio({
            owner: user,
            totalValue: initialValue,
            lastRebalance: block.timestamp,
            isActive: true
        });
        
        // Initialize supported tokens for this portfolio
        for (uint256 i = 0; i < tokenList.length; i++) {
            portfolioSupportedTokens[user].push(tokenList[i]);
        }
        
        emit PortfolioCreated(user, initialValue);
    }

    /**
     * @dev Optimize yield for a user
     * @param user Address of the user
     * @param amount Amount to optimize
     * @param strategyId Strategy to use
     */
    function optimizeYield(address user, uint256 amount, uint256 strategyId) external onlyOperator nonReentrant {
        require(user != address(0), "DeFAIManager: user cannot be zero address");
        require(amount > 0, "DeFAIManager: amount must be greater than 0");
        require(portfolios[user].isActive, "DeFAIManager: portfolio not active");
        require(yieldStrategies[strategyId].isActive, "DeFAIManager: strategy not active");
        require(amount >= yieldStrategies[strategyId].minDeposit, "DeFAIManager: amount below minimum");
        require(amount <= yieldStrategies[strategyId].maxDeposit, "DeFAIManager: amount above maximum");
        
        // Check user's risk profile
        require(riskProfiles[user].isApproved, "DeFAIManager: risk profile not approved");
        
        // Transfer tokens from user to contract
        nexusToken.safeTransferFrom(user, address(this), amount);
        
        // Update user yield
        userYield[user] += amount;
        
        // Add strategy to user's strategies
        userStrategies[user].push(strategyId);
        
        // Update strategy total deposited
        yieldStrategies[strategyId].totalDeposited += amount;
        
        emit YieldOptimized(user, amount, strategyId);
    }

    /**
     * @dev Rebalance user's portfolio
     * @param user Address of the user
     */
    function rebalancePortfolio(address user) external onlyOperator {
        require(user != address(0), "DeFAIManager: user cannot be zero address");
        require(portfolios[user].isActive, "DeFAIManager: portfolio not active");
        
        // Update portfolio value based on current market conditions
        // This would integrate with oracle services in a real implementation
        portfolios[user].lastRebalance = block.timestamp;
        
        emit PortfolioRebalanced(user, portfolios[user].totalValue);
    }

    /**
     * @dev Add a new yield strategy
     * @param strategyContract Address of the strategy contract
     * @param name Name of the strategy
     * @param minDeposit Minimum deposit amount
     * @param maxDeposit Maximum deposit amount
     * @param initialAPY Initial APY percentage
     */
    function addYieldStrategy(
        address strategyContract,
        string memory name,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 initialAPY
    ) external onlyAdmin {
        require(strategyContract != address(0), "DeFAIManager: strategy contract cannot be zero address");
        require(minDeposit > 0, "DeFAIManager: min deposit must be greater than 0");
        require(maxDeposit >= minDeposit, "DeFAIManager: max deposit must be >= min deposit");
        
        uint256 strategyId = _strategyIdCounter;
        _strategyIdCounter++;
        
        yieldStrategies[strategyId] = YieldStrategy({
            strategyContract: strategyContract,
            name: name,
            isActive: true,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            currentAPY: initialAPY,
            totalDeposited: 0
        });
        
        emit StrategyAdded(strategyId, strategyContract, name);
    }

    /**
     * @dev Update strategy parameters
     * @param strategyId Strategy ID to update
     * @param isActive Whether the strategy is active
     * @param newAPY New APY percentage
     */
    function updateStrategy(uint256 strategyId, bool isActive, uint256 newAPY) external onlyAdmin {
        require(strategyId > 0 && strategyId < _strategyIdCounter, "DeFAIManager: invalid strategy ID");
        
        yieldStrategies[strategyId].isActive = isActive;
        yieldStrategies[strategyId].currentAPY = newAPY;
        
        emit StrategyUpdated(strategyId, isActive, newAPY);
    }

    /**
     * @dev Update user's risk profile
     * @param user Address of the user
     * @param riskScore Risk score (0-1000)
     * @param maxLeverage Maximum leverage allowed
     * @param maxSinglePosition Maximum single position size
     * @param isApproved Whether the profile is approved
     */
    function updateRiskProfile(
        address user,
        uint256 riskScore,
        uint256 maxLeverage,
        uint256 maxSinglePosition,
        bool isApproved
    ) external onlyAdmin {
        require(user != address(0), "DeFAIManager: user cannot be zero address");
        require(riskScore <= 1000, "DeFAIManager: risk score cannot exceed 1000");
        
        riskProfiles[user] = RiskProfile({
            riskScore: riskScore,
            maxLeverage: maxLeverage,
            maxSinglePosition: maxSinglePosition,
            isApproved: isApproved
        });
        
        emit RiskProfileUpdated(user, riskScore, isApproved);
    }

    /**
     * @dev Collect management and performance fees
     * @param user Address of the user
     * @param portfolioValue Current portfolio value
     * @param performanceGain Performance gain since last fee collection
     */
    function collectFees(address user, uint256 portfolioValue, uint256 performanceGain) external onlyOperator {
        require(user != address(0), "DeFAIManager: user cannot be zero address");
        
        uint256 managementFee = (portfolioValue * managementFeePercentage) / 10000;
        uint256 performanceFee = (performanceGain * performanceFeePercentage) / 10000;
        
        uint256 totalFees = managementFee + performanceFee;
        
        if (totalFees > 0) {
            nexusToken.safeTransfer(feeRecipient, totalFees);
            emit FeesCollected(user, managementFee, performanceFee);
        }
    }

    /**
     * @dev Emergency withdrawal function
     * @param user Address to withdraw for
     * @param amount Amount to withdraw
     * @param reason Reason for emergency withdrawal
     */
    function emergencyWithdrawal(address user, uint256 amount, string memory reason) external onlyEmergency nonReentrant {
        require(user != address(0), "DeFAIManager: user cannot be zero address");
        require(amount > 0, "DeFAIManager: amount must be greater than 0");
        require(nexusToken.balanceOf(address(this)) >= amount, "DeFAIManager: insufficient contract balance");
        
        nexusToken.safeTransfer(user, amount);
        
        emit EmergencyWithdrawal(user, amount, reason);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    /**
     * @dev Get user's strategies
     * @param user Address of the user
     * @return Array of strategy IDs
     */
    function getUserStrategies(address user) external view returns (uint256[] memory) {
        return userStrategies[user];
    }

    /**
     * @dev Get supported tokens
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @dev Get total strategies count
     * @return Total number of strategies
     */
    function getTotalStrategies() external view returns (uint256) {
        return _strategyIdCounter - 1;
    }
}