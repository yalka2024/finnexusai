// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PortfolioManager
 * @dev Smart contract for managing decentralized portfolios
 * @author FinNexusAI Development Team
 * @notice This contract allows users to create and manage portfolios on-chain
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FinNexusToken.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract PortfolioManager is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    // Portfolio structures
    struct Portfolio {
        uint256 id;
        address owner;
        string name;
        string description;
        bool isActive;
        uint256 createdAt;
        uint256 lastUpdatedAt;
        uint256 totalValue;
        uint256 totalCostBasis;
        uint256 totalReturn;
        uint256 totalReturnPercentage;
    }

    struct Holding {
        uint256 portfolioId;
        address asset;
        uint256 quantity;
        uint256 averageCost;
        uint256 currentValue;
        uint256 unrealizedPnl;
        uint256 unrealizedPnlPercentage;
        bool isActive;
    }

    struct AssetInfo {
        address token;
        string symbol;
        string name;
        uint256 decimals;
        bool isSupported;
        uint256 minTradeAmount;
        uint256 maxTradeAmount;
    }

    // State variables
    mapping(uint256 => Portfolio) public portfolios;
    mapping(uint256 => mapping(address => Holding)) public holdings;
    mapping(address => uint256[]) public userPortfolios;
    mapping(address => AssetInfo) public supportedAssets;
    mapping(address => bool) public authorizedTraders;
    
    uint256 public nextPortfolioId;
    uint256 public totalPortfolios;
    uint256 public totalHoldings;
    
    // Events
    event PortfolioCreated(uint256 indexed portfolioId, address indexed owner, string name);
    event PortfolioUpdated(uint256 indexed portfolioId, string name, string description);
    event PortfolioDeleted(uint256 indexed portfolioId);
    event HoldingAdded(uint256 indexed portfolioId, address indexed asset, uint256 quantity);
    event HoldingUpdated(uint256 indexed portfolioId, address indexed asset, uint256 quantity);
    event HoldingRemoved(uint256 indexed portfolioId, address indexed asset);
    event AssetSupported(address indexed asset, string symbol, string name);
    event AssetUnsupported(address indexed asset);
    event TraderAuthorized(address indexed trader);
    event TraderUnauthorized(address indexed trader);

    // Modifiers
    modifier onlyPortfolioOwner(uint256 portfolioId) {
        require(portfolios[portfolioId].owner == msg.sender, "Not portfolio owner");
        _;
    }

    modifier onlyAuthorizedTrader() {
        require(authorizedTraders[msg.sender] || msg.sender == owner(), "Not authorized trader");
        _;
    }

    modifier portfolioExists(uint256 portfolioId) {
        require(portfolios[portfolioId].isActive, "Portfolio does not exist");
        _;
    }

    modifier assetSupported(address asset) {
        require(supportedAssets[asset].isSupported, "Asset not supported");
        _;
    }

    constructor() {
        nextPortfolioId = 1;
    }

    /**
     * @dev Create a new portfolio
     * @param name Portfolio name
     * @param description Portfolio description
     */
    function createPortfolio(string memory name, string memory description) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256) 
    {
        uint256 portfolioId = nextPortfolioId;
        nextPortfolioId++;
        
        portfolios[portfolioId] = Portfolio({
            id: portfolioId,
            owner: msg.sender,
            name: name,
            description: description,
            isActive: true,
            createdAt: block.timestamp,
            lastUpdatedAt: block.timestamp,
            totalValue: 0,
            totalCostBasis: 0,
            totalReturn: 0,
            totalReturnPercentage: 0
        });
        
        userPortfolios[msg.sender].push(portfolioId);
        totalPortfolios++;
        
        emit PortfolioCreated(portfolioId, msg.sender, name);
        return portfolioId;
    }

    /**
     * @dev Update portfolio information
     * @param portfolioId Portfolio ID
     * @param name New portfolio name
     * @param description New portfolio description
     */
    function updatePortfolio(
        uint256 portfolioId, 
        string memory name, 
        string memory description
    ) 
        external 
        onlyPortfolioOwner(portfolioId) 
        portfolioExists(portfolioId) 
    {
        portfolios[portfolioId].name = name;
        portfolios[portfolioId].description = description;
        portfolios[portfolioId].lastUpdatedAt = block.timestamp;
        
        emit PortfolioUpdated(portfolioId, name, description);
    }

    /**
     * @dev Delete a portfolio
     * @param portfolioId Portfolio ID
     */
    function deletePortfolio(uint256 portfolioId) 
        external 
        onlyPortfolioOwner(portfolioId) 
        portfolioExists(portfolioId) 
    {
        // Check if portfolio has any holdings
        require(totalHoldings == 0, "Portfolio has holdings");
        
        portfolios[portfolioId].isActive = false;
        totalPortfolios--;
        
        emit PortfolioDeleted(portfolioId);
    }

    /**
     * @dev Add a holding to a portfolio
     * @param portfolioId Portfolio ID
     * @param asset Asset address
     * @param quantity Quantity to add
     */
    function addHolding(
        uint256 portfolioId, 
        address asset, 
        uint256 quantity
    ) 
        external 
        onlyAuthorizedTrader 
        portfolioExists(portfolioId) 
        assetSupported(asset) 
        nonReentrant 
    {
        require(quantity > 0, "Quantity must be positive");
        
        Holding storage holding = holdings[portfolioId][asset];
        
        if (holding.isActive) {
            // Update existing holding
            uint256 totalQuantity = holding.quantity.add(quantity);
            uint256 totalCostBasis = holding.averageCost.mul(holding.quantity).add(
                _getCurrentPrice(asset).mul(quantity)
            );
            
            holding.quantity = totalQuantity;
            holding.averageCost = totalCostBasis.div(totalQuantity);
            holding.currentValue = _getCurrentPrice(asset).mul(totalQuantity);
            holding.unrealizedPnl = holding.currentValue.sub(holding.averageCost.mul(totalQuantity));
            holding.unrealizedPnlPercentage = holding.unrealizedPnl.mul(10000).div(holding.averageCost.mul(totalQuantity));
            
            emit HoldingUpdated(portfolioId, asset, totalQuantity);
        } else {
            // Create new holding
            uint256 currentPrice = _getCurrentPrice(asset);
            uint256 currentValue = currentPrice.mul(quantity);
            
            holdings[portfolioId][asset] = Holding({
                portfolioId: portfolioId,
                asset: asset,
                quantity: quantity,
                averageCost: currentPrice,
                currentValue: currentValue,
                unrealizedPnl: 0,
                unrealizedPnlPercentage: 0,
                isActive: true
            });
            
            totalHoldings++;
            emit HoldingAdded(portfolioId, asset, quantity);
        }
        
        // Update portfolio totals
        _updatePortfolioTotals(portfolioId);
    }

    /**
     * @dev Remove a holding from a portfolio
     * @param portfolioId Portfolio ID
     * @param asset Asset address
     * @param quantity Quantity to remove
     */
    function removeHolding(
        uint256 portfolioId, 
        address asset, 
        uint256 quantity
    ) 
        external 
        onlyAuthorizedTrader 
        portfolioExists(portfolioId) 
        nonReentrant 
    {
        Holding storage holding = holdings[portfolioId][asset];
        require(holding.isActive, "Holding does not exist");
        require(holding.quantity >= quantity, "Insufficient quantity");
        
        holding.quantity = holding.quantity.sub(quantity);
        
        if (holding.quantity == 0) {
            holding.isActive = false;
            totalHoldings--;
            emit HoldingRemoved(portfolioId, asset);
        } else {
            holding.currentValue = _getCurrentPrice(asset).mul(holding.quantity);
            holding.unrealizedPnl = holding.currentValue.sub(holding.averageCost.mul(holding.quantity));
            holding.unrealizedPnlPercentage = holding.unrealizedPnl.mul(10000).div(holding.averageCost.mul(holding.quantity));
            
            emit HoldingUpdated(portfolioId, asset, holding.quantity);
        }
        
        // Update portfolio totals
        _updatePortfolioTotals(portfolioId);
    }

    /**
     * @dev Update portfolio totals
     * @param portfolioId Portfolio ID
     */
    function _updatePortfolioTotals(uint256 portfolioId) internal {
        Portfolio storage portfolio = portfolios[portfolioId];
        uint256 totalValue = 0;
        uint256 totalCostBasis = 0;
        
        // This would require iterating through all holdings
        // For gas efficiency, this is a simplified version
        // In production, you'd want to track totals separately
        
        portfolio.totalValue = totalValue;
        portfolio.totalCostBasis = totalCostBasis;
        portfolio.totalReturn = totalValue.sub(totalCostBasis);
        portfolio.totalReturnPercentage = totalCostBasis > 0 ? 
            portfolio.totalReturn.mul(10000).div(totalCostBasis) : 0;
        portfolio.lastUpdatedAt = block.timestamp;
    }

    /**
     * @dev Get current price of an asset (simplified)
     * @param asset Asset address
     * @return current price
     */
    function _getCurrentPrice(address asset) internal view returns (uint256) {
        // This is a simplified version
        // In production, you'd integrate with price oracles
        return 1 ether; // Placeholder price
    }

    /**
     * @dev Add supported asset
     * @param asset Asset address
     * @param symbol Asset symbol
     * @param name Asset name
     * @param decimals Asset decimals
     */
    function addSupportedAsset(
        address asset,
        string memory symbol,
        string memory name,
        uint256 decimals
    ) external onlyOwner {
        supportedAssets[asset] = AssetInfo({
            token: asset,
            symbol: symbol,
            name: name,
            decimals: decimals,
            isSupported: true,
            minTradeAmount: 1,
            maxTradeAmount: 1000000 ether
        });
        
        emit AssetSupported(asset, symbol, name);
    }

    /**
     * @dev Remove supported asset
     * @param asset Asset address
     */
    function removeSupportedAsset(address asset) external onlyOwner {
        supportedAssets[asset].isSupported = false;
        emit AssetUnsupported(asset);
    }

    /**
     * @dev Authorize a trader
     * @param trader Trader address
     */
    function authorizeTrader(address trader) external onlyOwner {
        authorizedTraders[trader] = true;
        emit TraderAuthorized(trader);
    }

    /**
     * @dev Unauthorize a trader
     * @param trader Trader address
     */
    function unauthorizeTrader(address trader) external onlyOwner {
        authorizedTraders[trader] = false;
        emit TraderUnauthorized(trader);
    }

    /**
     * @dev Get portfolio information
     * @param portfolioId Portfolio ID
     * @return portfolio information
     */
    function getPortfolio(uint256 portfolioId) external view returns (Portfolio memory) {
        return portfolios[portfolioId];
    }

    /**
     * @dev Get holding information
     * @param portfolioId Portfolio ID
     * @param asset Asset address
     * @return holding information
     */
    function getHolding(uint256 portfolioId, address asset) external view returns (Holding memory) {
        return holdings[portfolioId][asset];
    }

    /**
     * @dev Get user portfolios
     * @param user User address
     * @return array of portfolio IDs
     */
    function getUserPortfolios(address user) external view returns (uint256[] memory) {
        return userPortfolios[user];
    }

    /**
     * @dev Get portfolio holdings count
     * @param portfolioId Portfolio ID
     * @return number of holdings
     */
    function getPortfolioHoldingsCount(uint256 portfolioId) external view returns (uint256) {
        // This would require additional tracking
        return 0;
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get contract statistics
     * @return total portfolios, total holdings
     */
    function getStats() external view returns (uint256, uint256) {
        return (totalPortfolios, totalHoldings);
    }
}
