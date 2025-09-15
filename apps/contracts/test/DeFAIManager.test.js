import { expect } from 'chai';
import pkg from 'hardhat';
const { ethers } = pkg;

describe('DeFAIManager', function () {
  let deFAIManager;
  let nexusToken;
  let potToken;
  let owner;
  let operator;
  let user1;
  let user2;
  let feeRecipient;

  beforeEach(async function () {
    [owner, operator, user1, user2, feeRecipient] = await ethers.getSigners();
    
    // Deploy tokens
    const NexusToken = await ethers.getContractFactory('NexusToken');
    nexusToken = await NexusToken.deploy(feeRecipient.address);
    
    const PoTToken = await ethers.getContractFactory('PoTToken');
    potToken = await PoTToken.deploy();
    
    // Deploy DeFAIManager
    const DeFAIManager = await ethers.getContractFactory('DeFAIManager');
    deFAIManager = await DeFAIManager.deploy(nexusToken.target, potToken.target, feeRecipient.address);
    
    // Grant operator role
    await deFAIManager.grantRole(await deFAIManager.OPERATOR_ROLE(), operator.address);
    
    // Mint some tokens to users for testing
    await nexusToken.mint(user1.address, ethers.parseEther('100000'));
    await nexusToken.mint(user2.address, ethers.parseEther('100000'));
  });

  describe('Deployment', function () {
    it('Should set correct token addresses', async function () {
      expect(await deFAIManager.nexusToken()).to.equal(nexusToken.target);
      expect(await deFAIManager.potToken()).to.equal(potToken.target);
    });

    it('Should grant admin role to deployer', async function () {
      const hasAdminRole = await deFAIManager.hasRole(await deFAIManager.ADMIN_ROLE(), owner.address);
      expect(hasAdminRole).to.be.true;
    });
  });

  describe('Portfolio Management', function () {
    it('Should create portfolio for user', async function () {
      const initialValue = ethers.parseEther('10000');
      
      await deFAIManager.connect(operator).createPortfolio(user1.address, initialValue);
      
      const portfolio = await deFAIManager.portfolios(user1.address);
      expect(portfolio.owner).to.equal(user1.address);
      expect(portfolio.totalValue).to.equal(initialValue);
      expect(portfolio.isActive).to.be.true;
    });

    it('Should reject creating portfolio for zero address', async function () {
      await expect(
        deFAIManager.connect(operator).createPortfolio(ethers.ZeroAddress, ethers.parseEther('1000'))
      ).to.be.revertedWith('DeFAIManager: user cannot be zero address');
    });

    it('Should reject creating duplicate portfolio', async function () {
      await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('1000'));
      
      await expect(
        deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('2000'))
      ).to.be.revertedWith('DeFAIManager: portfolio already exists');
    });

    it('Should rebalance portfolio', async function () {
      await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('10000'));
      
      await deFAIManager.connect(operator).rebalancePortfolio(user1.address);
      
      const portfolio = await deFAIManager.portfolios(user1.address);
      expect(portfolio.lastRebalance).to.be.greaterThan(0);
    });
  });

  describe('Yield Strategies', function () {
    beforeEach(async function () {
      // Add a yield strategy
      await deFAIManager.addYieldStrategy(
        user2.address, // Mock strategy contract
        'Test Strategy',
        ethers.parseEther('1000'), // min deposit
        ethers.parseEther('100000'), // max deposit
        1000 // 10% APY
      );
    });

    it('Should add yield strategy', async function () {
      const strategyId = 1;
      const strategy = await deFAIManager.yieldStrategies(strategyId);
      
      expect(strategy.strategyContract).to.equal(user2.address);
      expect(strategy.name).to.equal('Test Strategy');
      expect(strategy.isActive).to.be.true;
      expect(strategy.minDeposit).to.equal(ethers.parseEther('1000'));
      expect(strategy.maxDeposit).to.equal(ethers.parseEther('100000'));
      expect(strategy.currentAPY).to.equal(1000);
    });

    it('Should update strategy parameters', async function () {
      const strategyId = 1;
      
      await deFAIManager.updateStrategy(strategyId, false, 1500); // 15% APY
      
      const strategy = await deFAIManager.yieldStrategies(strategyId);
      expect(strategy.isActive).to.be.false;
      expect(strategy.currentAPY).to.equal(1500);
    });

    it('Should optimize yield for user', async function () {
      // Create portfolio and risk profile
      await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('10000'));
      await deFAIManager.updateRiskProfile(user1.address, 500, 200, ethers.parseEther('50000'), true);
      
      // Approve tokens for DeFAIManager
      await nexusToken.connect(user1).approve(deFAIManager.target, ethers.parseEther('5000'));
      
      // Optimize yield
      await deFAIManager.connect(operator).optimizeYield(user1.address, ethers.parseEther('5000'), 1);
      
      const userYield = await deFAIManager.userYield(user1.address);
      expect(userYield).to.equal(ethers.parseEther('5000'));
      
      const strategy = await deFAIManager.yieldStrategies(1);
      expect(strategy.totalDeposited).to.equal(ethers.parseEther('5000'));
    });

    it('Should reject yield optimization for inactive strategy', async function () {
      await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('10000'));
      await deFAIManager.updateRiskProfile(user1.address, 500, 200, ethers.parseEther('50000'), true);
      await deFAIManager.updateStrategy(1, false, 1000); // Deactivate strategy
      
      await nexusToken.connect(user1).approve(deFAIManager.target, ethers.parseEther('5000'));
      
      await expect(
        deFAIManager.connect(operator).optimizeYield(user1.address, ethers.parseEther('5000'), 1)
      ).to.be.revertedWith('DeFAIManager: strategy not active');
    });

    it('Should reject yield optimization below minimum deposit', async function () {
      await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('10000'));
      await deFAIManager.updateRiskProfile(user1.address, 500, 200, ethers.parseEther('50000'), true);
      
      await nexusToken.connect(user1).approve(deFAIManager.target, ethers.parseEther('500'));
      
      await expect(
        deFAIManager.connect(operator).optimizeYield(user1.address, ethers.parseEther('500'), 1)
      ).to.be.revertedWith('DeFAIManager: amount below minimum');
    });
  });

  describe('Risk Management', function () {
    it('Should update user risk profile', async function () {
      await deFAIManager.updateRiskProfile(user1.address, 300, 150, ethers.parseEther('25000'), true);
      
      const riskProfile = await deFAIManager.riskProfiles(user1.address);
      expect(riskProfile.riskScore).to.equal(300);
      expect(riskProfile.maxLeverage).to.equal(150);
      expect(riskProfile.maxSinglePosition).to.equal(ethers.parseEther('25000'));
      expect(riskProfile.isApproved).to.be.true;
    });

    it('Should reject yield optimization for unapproved risk profile', async function () {
      // Add strategy first
      await deFAIManager.addYieldStrategy(
        user2.address,
        'Test Strategy',
        ethers.parseEther('1000'),
        ethers.parseEther('100000'),
        1000
      );
      
      await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('10000'));
      await deFAIManager.updateRiskProfile(user1.address, 300, 150, ethers.parseEther('25000'), false);
      
      await nexusToken.connect(user1).approve(deFAIManager.target, ethers.parseEther('5000'));
      
      await expect(
        deFAIManager.connect(operator).optimizeYield(user1.address, ethers.parseEther('5000'), 1)
      ).to.be.revertedWith('DeFAIManager: risk profile not approved');
    });

    it('Should enforce maximum risk score', async function () {
      await expect(
        deFAIManager.updateRiskProfile(user1.address, 1001, 150, ethers.parseEther('25000'), true)
      ).to.be.revertedWith('DeFAIManager: risk score cannot exceed 1000');
    });
  });

  describe('Fee Collection', function () {
    it('Should collect management and performance fees', async function () {
      // First, send tokens to the contract for fee collection
      await nexusToken.transfer(deFAIManager.target, ethers.parseEther('10000'));
      
      const portfolioValue = ethers.parseEther('100000');
      const performanceGain = ethers.parseEther('10000');
      
      const initialFeeRecipientBalance = await nexusToken.balanceOf(feeRecipient.address);
      
      await deFAIManager.connect(operator).collectFees(user1.address, portfolioValue, performanceGain);
      
      const finalFeeRecipientBalance = await nexusToken.balanceOf(feeRecipient.address);
      const feesCollected = finalFeeRecipientBalance - initialFeeRecipientBalance;
      
      // Management fee: 2% of 100,000 = 2,000
      // Performance fee: 10% of 10,000 = 1,000
      // Total: 3,000 (but reduced by transfer fees of 3.5%)
      expect(feesCollected).to.be.greaterThan(ethers.parseEther('2900')); // At least 2.9 ETH collected
      expect(feesCollected).to.be.lessThan(ethers.parseEther('3000')); // Less than 3.0 ETH due to fees
    });
  });

  describe('Emergency Functions', function () {
    it('Should allow emergency withdrawal', async function () {
      // Send some tokens to the contract (more than needed to account for transfer fees)
      await nexusToken.transfer(deFAIManager.target, ethers.parseEther('10000'));
      
      const initialUserBalance = await nexusToken.balanceOf(user1.address);
      
      await deFAIManager.emergencyWithdrawal(user1.address, ethers.parseEther('5000'), 'Emergency test');
      
      const finalUserBalance = await nexusToken.balanceOf(user1.address);
      // Account for transfer fees (3.5% total)
      const expectedIncrease = ethers.parseEther('5000') * 965n / 1000n; // 96.5% after fees
      expect(finalUserBalance - initialUserBalance).to.be.closeTo(expectedIncrease, ethers.parseEther('1'));
    });

    it('Should reject emergency withdrawal by non-emergency role', async function () {
      await expect(
        deFAIManager.connect(operator).emergencyWithdrawal(user1.address, ethers.parseEther('1000'), 'Test')
      ).to.be.revertedWith('DeFAIManager: must have emergency role');
    });
  });

  describe('Pausable', function () {
    it('Should allow admin to pause contract', async function () {
      await deFAIManager.pause();
      const isPaused = await deFAIManager.paused();
      expect(isPaused).to.be.true;
    });

    it('Should reject non-admin from pausing', async function () {
      await expect(
        deFAIManager.connect(operator).pause()
      ).to.be.revertedWith('DeFAIManager: must have admin role');
    });
  });

  describe('Access Control', function () {
    it('Should reject non-operator from creating portfolios', async function () {
      await expect(
        deFAIManager.connect(user1).createPortfolio(user2.address, ethers.parseEther('1000'))
      ).to.be.revertedWith('DeFAIManager: must have operator role');
    });

    it('Should reject non-admin from adding strategies', async function () {
      await expect(
        deFAIManager.connect(operator).addYieldStrategy(
          user2.address,
          'Test Strategy',
          ethers.parseEther('1000'),
          ethers.parseEther('100000'),
          1000
        )
      ).to.be.revertedWith('DeFAIManager: must have admin role');
    });
  });

  describe('Edge Cases', function () {
    it('Should handle zero amount yield optimization', async function () {
      await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('10000'));
      await deFAIManager.updateRiskProfile(user1.address, 500, 200, ethers.parseEther('50000'), true);
      
      await expect(
        deFAIManager.connect(operator).optimizeYield(user1.address, 0, 1)
      ).to.be.revertedWith('DeFAIManager: amount must be greater than 0');
    });

    it('Should handle invalid strategy ID', async function () {
      await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('10000'));
      await deFAIManager.updateRiskProfile(user1.address, 500, 200, ethers.parseEther('50000'), true);
      
      await expect(
        deFAIManager.connect(operator).optimizeYield(user1.address, ethers.parseEther('5000'), 999)
      ).to.be.revertedWith('DeFAIManager: strategy not active');
    });
  });
});
