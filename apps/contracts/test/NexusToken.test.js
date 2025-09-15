import { expect } from 'chai';
import pkg from 'hardhat';
const { ethers } = pkg;

describe('NexusToken', function () {
  let nexusToken;
  let owner;
  let user1;
  let user2;
  let feeRecipient;

  beforeEach(async function () {
    [owner, user1, user2, feeRecipient] = await ethers.getSigners();
    const NexusToken = await ethers.getContractFactory('NexusToken');
    nexusToken = await NexusToken.deploy(feeRecipient.address);
  });

  describe('Deployment', function () {
    it('Should set the correct initial supply', async function () {
      const totalSupply = await nexusToken.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther('1000000000')); // 1 billion tokens
    });

    it('Should set the correct name and symbol', async function () {
      expect(await nexusToken.name()).to.equal('Nexus Token');
      expect(await nexusToken.symbol()).to.equal('NEXUS');
    });

    it('Should set the correct decimals', async function () {
      expect(await nexusToken.decimals()).to.equal(18);
    });

    it('Should set the owner as the initial holder', async function () {
      const balance = await nexusToken.balanceOf(owner.address);
      expect(balance).to.equal(ethers.parseEther('1000000000'));
    });
  });

  describe('Access Control', function () {
    it('Should grant admin role to deployer', async function () {
      const hasAdminRole = await nexusToken.hasRole(await nexusToken.ADMIN_ROLE(), owner.address);
      expect(hasAdminRole).to.be.true;
    });

    it('Should allow admin to grant minter role', async function () {
      await nexusToken.grantRole(await nexusToken.MINTER_ROLE(), user1.address);
      const hasMinterRole = await nexusToken.hasRole(await nexusToken.MINTER_ROLE(), user1.address);
      expect(hasMinterRole).to.be.true;
    });

    it('Should reject non-admin from granting roles', async function () {
      await expect(
        nexusToken.connect(user1).grantRole(await nexusToken.MINTER_ROLE(), user2.address)
      ).to.be.revertedWithCustomError(nexusToken, 'AccessControlUnauthorizedAccount');
    });
  });

  describe('Minting', function () {
    it('Should allow minter to mint tokens', async function () {
      await nexusToken.grantRole(await nexusToken.MINTER_ROLE(), user1.address);
      await nexusToken.connect(user1).mint(user2.address, ethers.parseEther('1000'));
      
      const balance = await nexusToken.balanceOf(user2.address);
      expect(balance).to.equal(ethers.parseEther('1000'));
    });

    it('Should reject non-minter from minting', async function () {
      await expect(
        nexusToken.connect(user1).mint(user2.address, ethers.parseEther('1000'))
      ).to.be.revertedWith('NexusToken: must have minter role');
    });

    it('Should enforce supply cap', async function () {
      const maxSupply = await nexusToken.cap();
      expect(maxSupply).to.equal(ethers.parseEther('2000000000')); // 2 billion tokens
    });
  });

  describe('Transfer Fees', function () {
    it('Should calculate correct transfer fees', async function () {
      const amount = ethers.parseEther('1000');
      const [transferFee, burnFee, totalFees] = await nexusToken.getTransferFees(amount);
      
      expect(transferFee).to.equal(ethers.parseEther('25')); // 2.5% of 1000
      expect(burnFee).to.equal(ethers.parseEther('10')); // 1% of 1000
      expect(totalFees).to.equal(ethers.parseEther('35'));
    });

    it('Should collect fees on transfer', async function () {
      const transferAmount = ethers.parseEther('1000');
      const initialFeeRecipientBalance = await nexusToken.balanceOf(feeRecipient.address);
      
      await nexusToken.transfer(user1.address, transferAmount);
      
      const finalFeeRecipientBalance = await nexusToken.balanceOf(feeRecipient.address);
      const feeCollected = finalFeeRecipientBalance - initialFeeRecipientBalance;
      expect(feeCollected).to.equal(ethers.parseEther('25')); // 2.5% transfer fee
      
      const user1Balance = await nexusToken.balanceOf(user1.address);
      expect(user1Balance).to.equal(ethers.parseEther('965')); // 1000 - 35 total fees
    });

    it('Should allow admin to update transfer fee', async function () {
      await nexusToken.updateTransferFee(500); // 5%
      const newFee = await nexusToken.transferFeePercentage();
      expect(newFee).to.equal(500);
    });

    it('Should reject non-admin from updating fees', async function () {
      await expect(
        nexusToken.connect(user1).updateTransferFee(500)
      ).to.be.revertedWith('NexusToken: must have admin role');
    });
  });

  describe('Anti-Whale Protection', function () {
    it('Should enforce maximum transfer amount', async function () {
      const maxTransfer = await nexusToken.maxTransferAmount();
      expect(maxTransfer).to.equal(ethers.parseEther('10000000')); // 10M tokens
      
      // First, mint tokens to exceed the max transfer amount
      await nexusToken.grantRole(await nexusToken.MINTER_ROLE(), owner.address);
      await nexusToken.mint(owner.address, ethers.parseEther('20000000'));
      
      // Remove admin role from owner to test anti-whale protection
      await nexusToken.revokeRole(await nexusToken.ADMIN_ROLE(), owner.address);
      
      // This should fail
      await expect(
        nexusToken.transfer(user1.address, maxTransfer + 1n)
      ).to.be.revertedWith('NexusToken: transfer amount exceeds maximum');
    });

    it('Should allow admin to bypass anti-whale protection', async function () {
      await nexusToken.grantRole(await nexusToken.ADMIN_ROLE(), user1.address);
      await nexusToken.grantRole(await nexusToken.MINTER_ROLE(), owner.address);
      await nexusToken.mint(user1.address, ethers.parseEther('20000000'));
      
      const largeAmount = ethers.parseEther('20000000'); // 20M tokens
      await expect(
        nexusToken.connect(user1).transfer(user2.address, largeAmount)
      ).to.not.be.reverted;
    });

    it('Should allow admin to toggle anti-whale protection', async function () {
      await nexusToken.toggleAntiWhale(false);
      const isEnabled = await nexusToken.antiWhaleEnabled();
      expect(isEnabled).to.be.false;
    });
  });

  describe('Pausable', function () {
    it('Should allow pauser to pause transfers', async function () {
      await nexusToken.pause();
      const isPaused = await nexusToken.paused();
      expect(isPaused).to.be.true;
    });

    it('Should reject transfers when paused', async function () {
      await nexusToken.pause();
      await expect(
        nexusToken.transfer(user1.address, ethers.parseEther('100'))
      ).to.be.revertedWithCustomError(nexusToken, 'EnforcedPause');
    });

    it('Should allow unpausing', async function () {
      await nexusToken.pause();
      await nexusToken.unpause();
      const isPaused = await nexusToken.paused();
      expect(isPaused).to.be.false;
    });
  });

  describe('Burning', function () {
    it('Should allow users to burn their own tokens', async function () {
      const burnAmount = ethers.parseEther('1000');
      const initialBalance = await nexusToken.balanceOf(owner.address);
      
      await nexusToken.burn(burnAmount);
      
      const finalBalance = await nexusToken.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance - burnAmount);
    });

    it('Should collect burn fees on transfers', async function () {
      const transferAmount = ethers.parseEther('1000');
      const initialTotalSupply = await nexusToken.totalSupply();
      
      await nexusToken.transfer(user1.address, transferAmount);
      
      const finalTotalSupply = await nexusToken.totalSupply();
      const burnedAmount = initialTotalSupply - finalTotalSupply;
      expect(burnedAmount).to.equal(ethers.parseEther('10')); // 1% burn fee
    });
  });

  describe('Edge Cases', function () {
    it('Should handle zero amount transfers', async function () {
      await expect(
        nexusToken.transfer(user1.address, 0)
      ).to.not.be.reverted;
    });

    it('Should handle maximum fee percentages', async function () {
      await expect(
        nexusToken.updateTransferFee(1001) // > 10%
      ).to.be.revertedWith('NexusToken: fee cannot exceed 10%');
    });

    it('Should handle zero address in fee recipient update', async function () {
      await expect(
        nexusToken.updateFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith('NexusToken: fee recipient cannot be zero address');
    });
  });
});
