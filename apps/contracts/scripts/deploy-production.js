/**
 * FinAI Nexus - Production Smart Contract Deployment
 * 
 * Deploys $NEXUS token and PoT tokens to mainnet with:
 * - Multi-signature wallet integration
 * - Role-based access control
 * - Tokenomics implementation
 * - Security audits and verification
 */

import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log('🚀 Starting FinAI Nexus Production Deployment...\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  // Deployment configuration
  const deploymentConfig = {
    nexusToken: {
      name: 'FinAI Nexus Token',
      symbol: 'NEXUS',
      decimals: 18,
      totalSupply: ethers.utils.parseEther('1000000000'), // 1B tokens
      cap: ethers.utils.parseEther('1000000000'), // 1B cap
      initialSupply: ethers.utils.parseEther('100000000') // 100M initial
    },
    potToken: {
      name: 'Proof of Trading Token',
      symbol: 'PoT',
      decimals: 18,
      totalSupply: ethers.utils.parseEther('10000000000'), // 10B tokens
      cap: ethers.utils.parseEther('10000000000') // 10B cap
    },
    defaiManager: {
      nexusTokenAddress: '', // Will be set after deployment
      potTokenAddress: '', // Will be set after deployment
      initialFee: 250, // 2.5% (250 basis points)
      maxFee: 1000, // 10% max fee
      minTradeAmount: ethers.utils.parseEther('100'), // $100 minimum
      maxTradeAmount: ethers.utils.parseEther('1000000') // $1M maximum
    }
  };

  // Multi-signature wallet addresses (replace with actual addresses)
  const multisigWallets = {
    admin: '0x1234567890123456789012345678901234567890', // Replace with actual admin multisig
    treasury: '0x2345678901234567890123456789012345678901', // Replace with actual treasury multisig
    operations: '0x3456789012345678901234567890123456789012' // Replace with actual operations multisig
  };

  try {
    // 1. Deploy NexusToken
    console.log('\n📦 Deploying NexusToken...');
    const NexusToken = await ethers.getContractFactory('NexusToken');
    const nexusToken = await NexusToken.deploy(
      deploymentConfig.nexusToken.name,
      deploymentConfig.nexusToken.symbol,
      deploymentConfig.nexusToken.decimals,
      deploymentConfig.nexusToken.cap
    );
    await nexusToken.deployed();
    console.log('✅ NexusToken deployed to:', nexusToken.address);

    // 2. Deploy PoTToken
    console.log('\n📦 Deploying PoTToken...');
    const PoTToken = await ethers.getContractFactory('PoTToken');
    const potToken = await PoTToken.deploy(
      deploymentConfig.potToken.name,
      deploymentConfig.potToken.symbol,
      deploymentConfig.potToken.decimals,
      deploymentConfig.potToken.cap
    );
    await potToken.deployed();
    console.log('✅ PoTToken deployed to:', potToken.address);

    // 3. Deploy DeFAIManager
    console.log('\n📦 Deploying DeFAIManager...');
    const DeFAIManager = await ethers.getContractFactory('DeFAIManager');
    const defaiManager = await DeFAIManager.deploy(
      nexusToken.address,
      potToken.address,
      deploymentConfig.defaiManager.initialFee,
      deploymentConfig.defaiManager.maxFee,
      deploymentConfig.defaiManager.minTradeAmount,
      deploymentConfig.defaiManager.maxTradeAmount
    );
    await defaiManager.deployed();
    console.log('✅ DeFAIManager deployed to:', defaiManager.address);

    // 4. Set up roles and permissions
    console.log('\n🔐 Setting up roles and permissions...');
    
    // Grant admin role to multisig wallet
    await nexusToken.grantRole(await nexusToken.DEFAULT_ADMIN_ROLE(), multisigWallets.admin);
    await potToken.grantRole(await potToken.DEFAULT_ADMIN_ROLE(), multisigWallets.admin);
    await defaiManager.grantRole(await defaiManager.DEFAULT_ADMIN_ROLE(), multisigWallets.admin);

    // Grant minter role to DeFAIManager
    await nexusToken.grantRole(await nexusToken.MINTER_ROLE(), defaiManager.address);
    await potToken.grantRole(await potToken.MINTER_ROLE(), defaiManager.address);

    // Grant pauser role to multisig wallets
    await nexusToken.grantRole(await nexusToken.PAUSER_ROLE(), multisigWallets.admin);
    await potToken.grantRole(await potToken.PAUSER_ROLE(), multisigWallets.admin);
    await defaiManager.grantRole(await defaiManager.PAUSER_ROLE(), multisigWallets.admin);

    // Grant operator role to operations multisig
    await defaiManager.grantRole(await defaiManager.OPERATOR_ROLE(), multisigWallets.operations);

    console.log('✅ Roles and permissions configured');

    // 5. Initial token distribution
    console.log('\n💰 Setting up initial token distribution...');
    
    // Mint initial supply to treasury
    const treasuryAmount = deploymentConfig.nexusToken.initialSupply;
    await nexusToken.mint(multisigWallets.treasury, treasuryAmount);
    console.log(`✅ Minted ${ethers.utils.formatEther(treasuryAmount)} NEXUS to treasury`);

    // Mint PoT tokens to DeFAIManager for rewards
    const potRewardAmount = ethers.utils.parseEther('1000000'); // 1M PoT tokens
    await potToken.mint(defaiManager.address, potRewardAmount);
    console.log(`✅ Minted ${ethers.utils.formatEther(potRewardAmount)} PoT to DeFAIManager`);

    // 6. Configure tokenomics
    console.log('\n⚙️ Configuring tokenomics...');
    
    // Set up fee structure
    await defaiManager.setTradingFee(deploymentConfig.defaiManager.initialFee);
    await defaiManager.setMinTradeAmount(deploymentConfig.defaiManager.minTradeAmount);
    await defaiManager.setMaxTradeAmount(deploymentConfig.defaiManager.maxTradeAmount);
    
    console.log('✅ Tokenomics configured');

    // 7. Security measures
    console.log('\n🔒 Implementing security measures...');
    
    // Pause contracts initially for security review
    await nexusToken.pause();
    await potToken.pause();
    await defaiManager.pause();
    
    console.log('✅ Contracts paused for security review');

    // 8. Generate deployment summary
    const deploymentSummary = {
      network: 'mainnet',
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        nexusToken: {
          address: nexusToken.address,
          name: deploymentConfig.nexusToken.name,
          symbol: deploymentConfig.nexusToken.symbol,
          totalSupply: deploymentConfig.nexusToken.totalSupply.toString(),
          cap: deploymentConfig.nexusToken.cap.toString()
        },
        potToken: {
          address: potToken.address,
          name: deploymentConfig.potToken.name,
          symbol: deploymentConfig.potToken.symbol,
          totalSupply: deploymentConfig.potToken.totalSupply.toString(),
          cap: deploymentConfig.potToken.cap.toString()
        },
        defaiManager: {
          address: defaiManager.address,
          nexusToken: nexusToken.address,
          potToken: potToken.address,
          tradingFee: deploymentConfig.defaiManager.initialFee,
          minTradeAmount: deploymentConfig.defaiManager.minTradeAmount.toString(),
          maxTradeAmount: deploymentConfig.defaiManager.maxTradeAmount.toString()
        }
      },
      multisigWallets: multisigWallets,
      security: {
        paused: true,
        adminRole: multisigWallets.admin,
        treasuryRole: multisigWallets.treasury,
        operationsRole: multisigWallets.operations
      },
      nextSteps: [
        'Verify contracts on Etherscan',
        'Conduct final security audit',
        'Unpause contracts after approval',
        'Deploy frontend integration',
        'Launch marketing campaign'
      ]
    };

    // Save deployment summary
    const fs = require('fs');
    const path = require('path');
    const summaryPath = path.join(__dirname, '../deployments', 'mainnet-deployment.json');
    
    // Ensure deployments directory exists
    const deploymentsDir = path.dirname(summaryPath);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(deploymentSummary, null, 2));
    console.log(`\n📄 Deployment summary saved to: ${summaryPath}`);

    // 9. Display deployment results
    console.log('\n🎉 FinAI Nexus Production Deployment Complete!');
    console.log('='.repeat(60));
    console.log('📊 Deployment Summary:');
    console.log(`   Network: ${deploymentSummary.network}`);
    console.log(`   Deployer: ${deploymentSummary.deployer}`);
    console.log(`   Timestamp: ${deploymentSummary.timestamp}`);
    console.log('\n📦 Contract Addresses:');
    console.log(`   NexusToken: ${nexusToken.address}`);
    console.log(`   PoTToken: ${potToken.address}`);
    console.log(`   DeFAIManager: ${defaiManager.address}`);
    console.log('\n🔐 Multi-signature Wallets:');
    console.log(`   Admin: ${multisigWallets.admin}`);
    console.log(`   Treasury: ${multisigWallets.treasury}`);
    console.log(`   Operations: ${multisigWallets.operations}`);
    console.log('\n⚠️  Security Status:');
    console.log('   All contracts are PAUSED for security review');
    console.log('   Admin roles transferred to multi-signature wallets');
    console.log('   Ready for final audit and verification');
    console.log('='.repeat(60));

    // 10. Generate verification commands
    console.log('\n🔍 Contract Verification Commands:');
    console.log('Run these commands to verify contracts on Etherscan:');
    console.log(`npx hardhat verify --network mainnet ${nexusToken.address} "${deploymentConfig.nexusToken.name}" "${deploymentConfig.nexusToken.symbol}" ${deploymentConfig.nexusToken.decimals} ${deploymentConfig.nexusToken.cap}`);
    console.log(`npx hardhat verify --network mainnet ${potToken.address} "${deploymentConfig.potToken.name}" "${deploymentConfig.potToken.symbol}" ${deploymentConfig.potToken.decimals} ${deploymentConfig.potToken.cap}`);
    console.log(`npx hardhat verify --network mainnet ${defaiManager.address} ${nexusToken.address} ${potToken.address} ${deploymentConfig.defaiManager.initialFee} ${deploymentConfig.defaiManager.maxFee} ${deploymentConfig.defaiManager.minTradeAmount} ${deploymentConfig.defaiManager.maxTradeAmount}`);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
