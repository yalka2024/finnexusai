/**
 * FinNexus AI - Multi-Signature Configuration Script
 * 
 * This script helps configure the multi-signature wallet addresses
 * for the FinNexus AI platform after they have been created.
 */

import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log('🔐 Configuring FinNexus AI Multi-Signature Wallets...');
  console.log('====================================================');

  // Get the current configuration
  const currentConfig = {
    adminMultisig: process.env.ADMIN_MULTISIG || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    operatorMultisig: process.env.OPERATOR_MULTISIG || '0x8ba1f109551bD432803012645Hac136c4b4d8b6',
    emergencyMultisig: process.env.EMERGENCY_MULTISIG || '0x9ca1f109551bD432803012645Hac136c4b4d8b6',
    treasuryMultisig: process.env.TREASURY_MULTISIG || '0xAcA1f109551bD432803012645Hac136c4b4d8b6'
  };

  console.log('\n📋 Current Multi-Signature Configuration:');
  console.log('==========================================');
  console.log('Admin Multi-sig:', currentConfig.adminMultisig);
  console.log('Operator Multi-sig:', currentConfig.operatorMultisig);
  console.log('Emergency Multi-sig:', currentConfig.emergencyMultisig);
  console.log('Treasury Multi-sig:', currentConfig.treasuryMultisig);

  // Validate addresses
  console.log('\n🔍 Validating Addresses:');
  console.log('========================');
  
  const validationResults = {};
  for (const [role, address] of Object.entries(currentConfig)) {
    const isValid = ethers.isAddress(address);
    validationResults[role] = isValid;
    console.log(`${role}: ${address} - ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  }

  // Check if all addresses are valid
  const allValid = Object.values(validationResults).every(result => result === true);
  
  if (allValid) {
    console.log('\n✅ All multi-signature addresses are valid!');
    console.log('\n🚀 Ready for mainnet deployment with multi-sig configuration.');
    
    // Generate deployment command
    console.log('\n📝 Next Steps:');
    console.log('==============');
    console.log('1. Deploy contracts to mainnet:');
    console.log('   npx hardhat run scripts/deploy-mainnet.js --network mainnet');
    console.log('');
    console.log('2. Setup multi-sig roles:');
    console.log('   npx hardhat run scripts/setup-multisig.js --network mainnet');
    console.log('');
    console.log('3. Verify role assignments:');
    console.log('   npx hardhat run scripts/verify-roles.js --network mainnet');
    
  } else {
    console.log('\n❌ Some addresses are invalid. Please update your .env.mainnet file.');
    console.log('\n📝 Required Environment Variables:');
    console.log('===================================');
    console.log('ADMIN_MULTISIG=0x... # Your Admin Safe address');
    console.log('OPERATOR_MULTISIG=0x... # Your Operator Safe address');
    console.log('EMERGENCY_MULTISIG=0x... # Your Emergency Safe address');
    console.log('TREASURY_MULTISIG=0x... # Your Treasury Safe address');
    
    console.log('\n📖 See docs/multisig-setup-checklist.md for detailed setup instructions.');
  }

  // Generate configuration summary
  const configSummary = {
    timestamp: new Date().toISOString(),
    network: ethers.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    multisigWallets: currentConfig,
    validation: validationResults,
    readyForDeployment: allValid
  };

  console.log('\n💾 Configuration Summary:');
  console.log('==========================');
  console.log(JSON.stringify(configSummary, null, 2));

  return configSummary;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Configuration failed:', error);
    process.exit(1);
  });
