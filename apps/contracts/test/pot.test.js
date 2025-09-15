import { expect } from 'chai';
import pkg from 'hardhat';
const { ethers } = pkg;

describe('PoTToken', function () {
  it('should mint and transfer tokens', async function () {
    const [owner, user] = await ethers.getSigners();
    const PoTToken = await ethers.getContractFactory('PoTToken');
    const pot = await PoTToken.deploy();
    
    // Mint tokens using the mintReward function
    await pot.mintReward(user.address, 1000, 0, 'Test reward'); // 0 = TRADING_PERFORMANCE
    expect(await pot.balanceOf(user.address)).to.equal(1000);
    
    // Transfer tokens
    await pot.connect(user).transfer(owner.address, 500);
    expect(await pot.balanceOf(owner.address)).to.equal(500);
  });
  
  it('should update trust scores', async function () {
    const [owner, user] = await ethers.getSigners();
    const PoTToken = await ethers.getContractFactory('PoTToken');
    const pot = await PoTToken.deploy();
    
    // Update trust score
    await pot.updateTrustScore(user.address, 800, 'High performance trader');
    const trustScore = await pot.trustScores(user.address);
    expect(trustScore.score).to.equal(800);
  });
});
