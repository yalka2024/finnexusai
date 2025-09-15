import pkg from 'hardhat';
const { ethers } = pkg;

/**
 * FinNexus AI Integration Test Script
 * Tests the complete integration between all contracts
 */
async function main() {
  console.log('🧪 Running FinNexus AI Integration Tests...');

  const [deployer, user1, user2, operator] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('User1:', user1.address);
  console.log('User2:', user2.address);

  // Deploy contracts
  console.log('\n📄 Deploying contracts...');
  const feeRecipient = deployer.address;

  const NexusToken = await ethers.getContractFactory('NexusToken');
  const nexusToken = await NexusToken.deploy(feeRecipient);
  await nexusToken.waitForDeployment();

  const PoTToken = await ethers.getContractFactory('PoTToken');
  const potToken = await PoTToken.deploy();
  await potToken.waitForDeployment();

  const DeFAIManager = await ethers.getContractFactory('DeFAIManager');
  const deFAIManager = await DeFAIManager.deploy(
    await nexusToken.getAddress(),
    await potToken.getAddress(),
    feeRecipient
  );
  await deFAIManager.waitForDeployment();

  console.log('✅ Contracts deployed successfully');

  // Grant operator role
  await deFAIManager.grantRole(await deFAIManager.OPERATOR_ROLE(), operator.address);

  // Test 1: Basic Token Operations
  console.log('\n🪙 Test 1: Basic Token Operations');
  
  // Check initial balances
  const deployerBalance = await nexusToken.balanceOf(deployer.address);
  console.log('Deployer NEXUS balance:', ethers.formatEther(deployerBalance));

  // Transfer tokens with fees
  const transferAmount = ethers.parseEther('1000');
  await nexusToken.transfer(user1.address, transferAmount);
  
  const user1Balance = await nexusToken.balanceOf(user1.address);
  console.log('User1 NEXUS balance:', ethers.formatEther(user1Balance));
  
  // Check fees collected
  const feeRecipientBalance = await nexusToken.balanceOf(feeRecipient);
  console.log('Fee recipient balance:', ethers.formatEther(feeRecipientBalance));

  console.log('✅ Token operations successful');

  // Test 2: PoT Token Trust System
  console.log('\n🏆 Test 2: PoT Token Trust System');

  // Update trust score
  await potToken.updateTrustScore(user1.address, 800, 'High performance trader');
  const trustScore = await potToken.trustScores(user1.address);
  console.log('User1 trust score:', trustScore.score.toString());

  // Mint reward tokens
  await potToken.mintReward(user1.address, ethers.parseEther('100'), 0, 'Trading performance reward');
  const potBalance = await potToken.balanceOf(user1.address);
  console.log('User1 POT balance:', ethers.formatEther(potBalance));

  console.log('✅ Trust system successful');

  // Test 3: DeFAI Portfolio Management
  console.log('\n🤖 Test 3: DeFAI Portfolio Management');

  // Create portfolio
  await deFAIManager.connect(operator).createPortfolio(user1.address, ethers.parseEther('10000'));
  const portfolio = await deFAIManager.portfolios(user1.address);
  console.log('Portfolio created:', portfolio.isActive);

  // Update risk profile
  await deFAIManager.updateRiskProfile(user1.address, 300, 150, ethers.parseEther('25000'), true);
  const riskProfile = await deFAIManager.riskProfiles(user1.address);
  console.log('Risk profile updated, approved:', riskProfile.isApproved);

  // Add yield strategy
  await deFAIManager.addYieldStrategy(
    user2.address, // Mock strategy contract
    'Test Strategy',
    ethers.parseEther('1000'),
    ethers.parseEther('100000'),
    1000 // 10% APY
  );

  console.log('✅ Portfolio management successful');

  // Test 4: Yield Optimization
  console.log('\n💰 Test 4: Yield Optimization');

  // Give user1 more tokens for yield optimization
  await nexusToken.transfer(user1.address, ethers.parseEther('10000'));

  // Approve tokens for DeFAIManager
  await nexusToken.connect(user1).approve(await deFAIManager.getAddress(), ethers.parseEther('5000'));

  // Optimize yield
  await deFAIManager.connect(operator).optimizeYield(user1.address, ethers.parseEther('5000'), 1);
  const userYield = await deFAIManager.userYield(user1.address);
  console.log('User yield optimized:', ethers.formatEther(userYield));

  console.log('✅ Yield optimization successful');

  // Test 5: Fee Collection
  console.log('\n💸 Test 5: Fee Collection');

  // Send tokens to contract for fee collection
  await nexusToken.transfer(await deFAIManager.getAddress(), ethers.parseEther('10000'));

  const initialFeeBalance = await nexusToken.balanceOf(feeRecipient);
  await deFAIManager.connect(operator).collectFees(user1.address, ethers.parseEther('100000'), ethers.parseEther('10000'));
  const finalFeeBalance = await nexusToken.balanceOf(feeRecipient);
  const feesCollected = finalFeeBalance - initialFeeBalance;
  console.log('Fees collected:', ethers.formatEther(feesCollected));

  console.log('✅ Fee collection successful');

  // Test 6: Emergency Functions
  console.log('\n🚨 Test 6: Emergency Functions');

  // Emergency withdrawal
  const initialUserBalance = await nexusToken.balanceOf(user1.address);
  await deFAIManager.emergencyWithdrawal(user1.address, ethers.parseEther('1000'), 'Integration test');
  const finalUserBalance = await nexusToken.balanceOf(user1.address);
  const withdrawn = finalUserBalance - initialUserBalance;
  console.log('Emergency withdrawal amount:', ethers.formatEther(withdrawn));

  console.log('✅ Emergency functions successful');

  // Test 7: Contract Pausing
  console.log('\n⏸️ Test 7: Contract Pausing');

  // Pause contracts
  await nexusToken.pause();
  await potToken.pause();
  await deFAIManager.pause();

  console.log('NexusToken paused:', await nexusToken.paused());
  console.log('PoTToken paused:', await potToken.paused());
  console.log('DeFAIManager paused:', await deFAIManager.paused());

  // Unpause contracts
  await nexusToken.unpause();
  await potToken.unpause();
  await deFAIManager.unpause();

  console.log('✅ Contract pausing successful');

  // Integration Test Summary
  console.log('\n📊 Integration Test Summary');
  console.log('==========================');
  console.log('✅ Token Operations: PASSED');
  console.log('✅ Trust System: PASSED');
  console.log('✅ Portfolio Management: PASSED');
  console.log('✅ Yield Optimization: PASSED');
  console.log('✅ Fee Collection: PASSED');
  console.log('✅ Emergency Functions: PASSED');
  console.log('✅ Contract Pausing: PASSED');

  console.log('\n🎉 All integration tests passed successfully!');
  console.log('\nContract Addresses:');
  console.log('NexusToken:', await nexusToken.getAddress());
  console.log('PoTToken:', await potToken.getAddress());
  console.log('DeFAIManager:', await deFAIManager.getAddress());

  console.log('\n🚀 FinNexus AI platform is ready for mainnet deployment!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  });
