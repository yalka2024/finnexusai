import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log('🚀 Starting FinNexus AI Mainnet Deployment...');
  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log('Chain ID:', (await ethers.provider.getNetwork()).chainId);

  // Verify environment variables
  const requiredEnvVars = ['MAINNET_RPC_URL', 'PRIVATE_KEY', 'ETHERSCAN_API_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');

  // Check if deployer has sufficient balance
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther('0.1')) {
    throw new Error('Insufficient balance for deployment. Need at least 0.1 ETH');
  }

  // Deploy fee recipient (using deployer as initial fee recipient)
  const feeRecipient = deployer.address;
  console.log('Fee recipient:', feeRecipient);

  // Deploy NexusToken
  console.log('\n📄 Deploying NexusToken...');
  const NexusToken = await ethers.getContractFactory('NexusToken');
  const nexusToken = await NexusToken.deploy(feeRecipient);
  await nexusToken.waitForDeployment();
  const nexusTokenAddress = await nexusToken.getAddress();
  console.log('✅ NexusToken deployed to:', nexusTokenAddress);

  // Deploy PoTToken
  console.log('\n🏆 Deploying PoTToken...');
  const PoTToken = await ethers.getContractFactory('PoTToken');
  const potToken = await PoTToken.deploy();
  await potToken.waitForDeployment();
  const potTokenAddress = await potToken.getAddress();
  console.log('✅ PoTToken deployed to:', potTokenAddress);

  // Deploy DeFAIManager
  console.log('\n🤖 Deploying DeFAIManager...');
  const DeFAIManager = await ethers.getContractFactory('DeFAIManager');
  const deFAIManager = await DeFAIManager.deploy(nexusTokenAddress, potTokenAddress, feeRecipient);
  await deFAIManager.waitForDeployment();
  const deFAIManagerAddress = await deFAIManager.getAddress();
  console.log('✅ DeFAIManager deployed to:', deFAIManagerAddress);

  // Verify contracts on Etherscan
  console.log('\n🔍 Verifying contracts on Etherscan...');
  try {
    console.log('Verifying NexusToken...');
    await hre.run('verify:verify', {
      address: nexusTokenAddress,
      constructorArguments: [feeRecipient],
    });
    console.log('✅ NexusToken verified');

    console.log('Verifying PoTToken...');
    await hre.run('verify:verify', {
      address: potTokenAddress,
      constructorArguments: [],
    });
    console.log('✅ PoTToken verified');

    console.log('Verifying DeFAIManager...');
    await hre.run('verify:verify', {
      address: deFAIManagerAddress,
      constructorArguments: [nexusTokenAddress, potTokenAddress, feeRecipient],
    });
    console.log('✅ DeFAIManager verified');
  } catch (error) {
    console.warn('⚠️ Verification failed:', error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    feeRecipient: feeRecipient,
    contracts: {
      NexusToken: nexusTokenAddress,
      PoTToken: potTokenAddress,
      DeFAIManager: deFAIManagerAddress,
    },
    deploymentTx: {
      nexusToken: nexusToken.deploymentTransaction()?.hash,
      potToken: potToken.deploymentTransaction()?.hash,
      deFAIManager: deFAIManager.deploymentTransaction()?.hash,
    },
    timestamp: new Date().toISOString(),
    gasUsed: {
      nexusToken: nexusToken.deploymentTransaction()?.gasLimit?.toString(),
      potToken: potToken.deploymentTransaction()?.gasLimit?.toString(),
      deFAIManager: deFAIManager.deploymentTransaction()?.gasLimit?.toString(),
    }
  };

  console.log('\n📋 Deployment Summary:');
  console.log('=====================================');
  console.log('Network:', deploymentInfo.network);
  console.log('Chain ID:', deploymentInfo.chainId.toString());
  console.log('Deployer:', deploymentInfo.deployer);
  console.log('Fee Recipient:', deploymentInfo.feeRecipient);
  console.log('\nContract Addresses:');
  console.log('NexusToken:', deploymentInfo.contracts.NexusToken);
  console.log('PoTToken:', deploymentInfo.contracts.PoTToken);
  console.log('DeFAIManager:', deploymentInfo.contracts.DeFAIManager);
  console.log('\nTransaction Hashes:');
  console.log('NexusToken:', deploymentInfo.deploymentTx.nexusToken);
  console.log('PoTToken:', deploymentInfo.deploymentTx.potToken);
  console.log('DeFAIManager:', deploymentInfo.deploymentTx.deFAIManager);

  // Save to file
  const fs = require('fs');
  const deploymentFile = `deployments/mainnet-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  // Create .env file for frontend/backend integration
  const envContent = `# FinNexus AI Mainnet Configuration
NEXUS_TOKEN_ADDRESS=${nexusTokenAddress}
POT_TOKEN_ADDRESS=${potTokenAddress}
DEFAI_MANAGER_ADDRESS=${deFAIManagerAddress}
MAINNET_RPC_URL=${process.env.MAINNET_RPC_URL}
ETHERSCAN_API_KEY=${process.env.ETHERSCAN_API_KEY}
DEPLOYMENT_TIMESTAMP=${deploymentInfo.timestamp}
`;
  
  fs.writeFileSync('.env.mainnet', envContent);
  console.log('📄 Environment file created: .env.mainnet');

  console.log('\n🎉 Mainnet deployment completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Update your frontend/backend with the new contract addresses');
  console.log('2. Set up monitoring and alerting');
  console.log('3. Configure multi-signature wallet for admin operations');
  console.log('4. Implement proper key management');
  console.log('5. Set up backup and disaster recovery procedures');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
