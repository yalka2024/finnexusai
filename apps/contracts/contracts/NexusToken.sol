// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NexusToken
 * @dev ERC20 token for the FinNexus AI platform with enhanced security features
 * @notice This contract implements a capped, pausable, burnable ERC20 token with role-based access control
 */
contract NexusToken is ERC20, ERC20Burnable, ERC20Pausable, ERC20Capped, AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Token configuration
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant MAX_SUPPLY = 2_000_000_000 * 10**18; // 2 billion tokens cap
    
    // Fee configuration
    uint256 public transferFeePercentage = 250; // 2.5% (250 basis points)
    uint256 public burnFeePercentage = 100; // 1% (100 basis points)
    address public feeRecipient;
    
    // Anti-whale protection
    uint256 public maxTransferAmount = 10_000_000 * 10**18; // 10M tokens max per transfer
    bool public antiWhaleEnabled = true;
    
    // Events
    event TransferFeeUpdated(uint256 newFeePercentage);
    event BurnFeeUpdated(uint256 newFeePercentage);
    event FeeRecipientUpdated(address newFeeRecipient);
    event MaxTransferAmountUpdated(uint256 newAmount);
    event AntiWhaleToggled(bool enabled);
    event FeesCollected(address indexed from, uint256 transferFee, uint256 burnFee);
    
    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "NexusToken: must have admin role");
        _;
    }
    
    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "NexusToken: must have minter role");
        _;
    }
    
    modifier onlyPauser() {
        require(hasRole(PAUSER_ROLE, msg.sender), "NexusToken: must have pauser role");
        _;
    }
    
    modifier antiWhaleCheck(address from, address to, uint256 amount) {
        if (antiWhaleEnabled && !hasRole(ADMIN_ROLE, from) && !hasRole(ADMIN_ROLE, to)) {
            require(amount <= maxTransferAmount, "NexusToken: transfer amount exceeds maximum");
        }
        _;
    }

    constructor(address _feeRecipient) 
        ERC20("Nexus Token", "NEXUS")
        ERC20Capped(MAX_SUPPLY)
    {
        require(_feeRecipient != address(0), "NexusToken: fee recipient cannot be zero address");
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Set fee recipient
        feeRecipient = _feeRecipient;
        
        // Mint initial supply
        _mint(msg.sender, INITIAL_SUPPLY);
        
        emit FeeRecipientUpdated(_feeRecipient);
    }

    /**
     * @dev Mint tokens to a specific address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /**
     * @dev Pause token transfers
     */
    function pause() external onlyPauser {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyPauser {
        _unpause();
    }

    /**
     * @dev Update transfer fee percentage
     * @param newFeePercentage New fee percentage in basis points (100 = 1%)
     */
    function updateTransferFee(uint256 newFeePercentage) external onlyAdmin {
        require(newFeePercentage <= 1000, "NexusToken: fee cannot exceed 10%");
        transferFeePercentage = newFeePercentage;
        emit TransferFeeUpdated(newFeePercentage);
    }

    /**
     * @dev Update burn fee percentage
     * @param newFeePercentage New burn fee percentage in basis points (100 = 1%)
     */
    function updateBurnFee(uint256 newFeePercentage) external onlyAdmin {
        require(newFeePercentage <= 500, "NexusToken: burn fee cannot exceed 5%");
        burnFeePercentage = newFeePercentage;
        emit BurnFeeUpdated(newFeePercentage);
    }

    /**
     * @dev Update fee recipient address
     * @param newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address newFeeRecipient) external onlyAdmin {
        require(newFeeRecipient != address(0), "NexusToken: fee recipient cannot be zero address");
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(newFeeRecipient);
    }

    /**
     * @dev Update maximum transfer amount for anti-whale protection
     * @param newAmount New maximum transfer amount
     */
    function updateMaxTransferAmount(uint256 newAmount) external onlyAdmin {
        require(newAmount > 0, "NexusToken: max transfer amount must be greater than 0");
        maxTransferAmount = newAmount;
        emit MaxTransferAmountUpdated(newAmount);
    }

    /**
     * @dev Toggle anti-whale protection
     * @param enabled Whether to enable anti-whale protection
     */
    function toggleAntiWhale(bool enabled) external onlyAdmin {
        antiWhaleEnabled = enabled;
        emit AntiWhaleToggled(enabled);
    }

    /**
     * @dev Override transfer function to include fees and anti-whale protection
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        nonReentrant 
        antiWhaleCheck(msg.sender, to, amount) 
        returns (bool) 
    {
        uint256 transferFee = calculateTransferFee(amount);
        uint256 burnFee = calculateBurnFee(amount);
        uint256 netAmount = amount - transferFee - burnFee;
        
        // Collect fees
        if (transferFee > 0) {
            _transfer(msg.sender, feeRecipient, transferFee);
        }
        
        if (burnFee > 0) {
            _burn(msg.sender, burnFee);
        }
        
        // Transfer net amount
        _transfer(msg.sender, to, netAmount);
        
        emit FeesCollected(msg.sender, transferFee, burnFee);
        
        return true;
    }

    /**
     * @dev Override transferFrom function to include fees and anti-whale protection
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        nonReentrant 
        antiWhaleCheck(from, to, amount) 
        returns (bool) 
    {
        uint256 transferFee = calculateTransferFee(amount);
        uint256 burnFee = calculateBurnFee(amount);
        uint256 netAmount = amount - transferFee - burnFee;
        
        // Collect fees
        if (transferFee > 0) {
            _transfer(from, feeRecipient, transferFee);
        }
        
        if (burnFee > 0) {
            _burn(from, burnFee);
        }
        
        // Transfer net amount
        _transfer(from, to, netAmount);
        
        // Update allowance
        uint256 currentAllowance = allowance(from, msg.sender);
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }
        
        emit FeesCollected(from, transferFee, burnFee);
        
        return true;
    }

    /**
     * @dev Calculate transfer fee for a given amount
     * @param amount Amount to calculate fee for
     * @return Fee amount
     */
    function calculateTransferFee(uint256 amount) public view returns (uint256) {
        return (amount * transferFeePercentage) / 10000;
    }

    /**
     * @dev Calculate burn fee for a given amount
     * @param amount Amount to calculate fee for
     * @return Fee amount
     */
    function calculateBurnFee(uint256 amount) public view returns (uint256) {
        return (amount * burnFeePercentage) / 10000;
    }

    /**
     * @dev Get total fees for a transfer amount
     * @param amount Amount to calculate fees for
     * @return transferFee Transfer fee amount
     * @return burnFee Burn fee amount
     * @return totalFees Total fees amount
     */
    function getTransferFees(uint256 amount) external view returns (uint256 transferFee, uint256 burnFee, uint256 totalFees) {
        transferFee = calculateTransferFee(amount);
        burnFee = calculateBurnFee(amount);
        totalFees = transferFee + burnFee;
    }

    // Required overrides for multiple inheritance
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Capped, ERC20Pausable) {
        super._update(from, to, value);
    }
}