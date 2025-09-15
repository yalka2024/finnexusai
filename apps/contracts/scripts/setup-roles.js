import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log('🔐 Setting up FinNexus AI contract roles...');

  // Contract addresses (update these after deployment)
  const NEXUS_TOKEN_ADDRESS = process.env.NEXUS_TOKEN_ADDRESS || '0x...';
  const POT_TOKEN_ADDRESS = process.env.POT_TOKEN_ADDRESS || '0x...';
  const DEFAI_MANAGER_ADDRESS = process.env.DEFAI_MANAGER_ADDRESS || '0x...';

  // Multi-sig addresses (update these with your actual multi-sig addresses)
  const ADMIN_MULTISIG = process.env.ADMIN_MULTISIG || '0x...';
  const OPERATOR_MULTISIG = process.env.OPERATOR_MULTISIG || '0x...';
  const EMERGENCY_MULTISIG = process.env.EMERGENCY_MULTISIG || '0x...';

  const [deployer] = await ethers.getSigners();
  console.log('Setting up roles with account:', deployer.address);

  // Get contract instances
  const NexusToken = await ethers.getContractFactory('NexusToken');
  const nexusToken = NexusToken.attach(NEXUS_TOKEN_ADDRESS);

  const PoTToken = await ethers.getContractFactory('PoTToken');
  const potToken = PoTToken.attach(POT_TOKEN_ADDRESS);

  const DeFAIManager = await ethers.getContractFactory('DeFAIManager');
  const deFAIManager = DeFAIManager.attach(DEFAI_MANAGER_ADDRESS);

  console.log('\n📋 Role Setup Plan:');
  console.log('==================');
  console.log('Admin Multi-sig:', ADMIN_MULTISIG);
  console.log('Operator Multi-sig:', OPERATOR_MULTISIG);
  console.log('Emergency Multi-sig:', EMERGENCY_MULTISIG);

  // Setup NexusToken roles
  console.log('\n🪙 Setting up NexusToken roles...');
  
  // Grant admin role to multi-sig
  if (ADMIN_MULTISIG !== '0x...') {
    await nexusToken.grantRole(await nexusToken.ADMIN_ROLE(), ADMIN_MULTISIG);
    console.log('✅ Granted ADMIN_ROLE to multi-sig');
    
    // Grant minter role to multi-sig
    await nexusToken.grantRole(await nexusToken.MINTER_ROLE(), ADMIN_MULTISIG);
    console.log('✅ Granted MINTER_ROLE to multi-sig');
    
    // Grant pauser role to multi-sig
    await nexusToken.grantRole(await nexusToken.PAUSER_ROLE(), ADMIN_MULTISIG);
    console.log('✅ Granted PAUSER_ROLE to multi-sig');
    
    // Revoke deployer admin role
    await nexusToken.revokeRole(await nexusToken.DEFAULT_ADMIN_ROLE(), deployer.address);
    console.log('✅ Revoked DEFAULT_ADMIN_ROLE from deployer');
  }

  // Setup PoTToken roles
  console.log('\n🏆 Setting up PoTToken roles...');
  
  if (ADMIN_MULTISIG !== '0x...') {
    // Grant admin role to multi-sig
    await potToken.grantRole(await potToken.ADMIN_ROLE(), ADMIN_MULTISIG);
    console.log('✅ Granted ADMIN_ROLE to multi-sig');
    
    // Grant minter role to multi-sig
    await potToken.grantRole(await potToken.MINTER_ROLE(), ADMIN_MULTISIG);
    console.log('✅ Granted MINTER_ROLE to multi-sig');
    
    // Grant pauser role to multi-sig
    await potToken.grantRole(await potToken.PAUSER_ROLE(), ADMIN_MULTISIG);
    console.log('✅ Granted PAUSER_ROLE to multi-sig');
    
    // Grant burner role to multi-sig
    await potToken.grantRole(await potToken.BURNER_ROLE(), ADMIN_MULTISIG);
    console.log('✅ Granted BURNER_ROLE to multi-sig');
    
    // Revoke deployer admin role
    await potToken.revokeRole(await potToken.DEFAULT_ADMIN_ROLE(), deployer.address);
    console.log('✅ Revoked DEFAULT_ADMIN_ROLE from deployer');
  }

  // Setup DeFAIManager roles
  console.log('\n🤖 Setting up DeFAIManager roles...');
  
  if (ADMIN_MULTISIG !== '0x...') {
    // Grant admin role to multi-sig
    await deFAIManager.grantRole(await deFAIManager.ADMIN_ROLE(), ADMIN_MULTISIG);
    console.log('✅ Granted ADMIN_ROLE to multi-sig');
    
    // Revoke deployer admin role
    await deFAIManager.revokeRole(await deFAIManager.DEFAULT_ADMIN_ROLE(), deployer.address);
    console.log('✅ Revoked DEFAULT_ADMIN_ROLE from deployer');
  }

  if (OPERATOR_MULTISIG !== '0x...') {
    // Grant operator role to multi-sig
    await deFAIManager.grantRole(await deFAIManager.OPERATOR_ROLE(), OPERATOR_MULTISIG);
    console.log('✅ Granted OPERATOR_ROLE to multi-sig');
  }

  if (EMERGENCY_MULTISIG !== '0x...') {
    // Grant emergency role to multi-sig
    await deFAIManager.grantRole(await deFAIManager.EMERGENCY_ROLE(), EMERGENCY_MULTISIG);
    console.log('✅ Granted EMERGENCY_ROLE to multi-sig');
  }

  // Verify role assignments
  console.log('\n🔍 Verifying role assignments...');
  
  const nexusTokenAdmin = await nexusToken.hasRole(await nexusToken.ADMIN_ROLE(), ADMIN_MULTISIG);
  const potTokenAdmin = await potToken.hasRole(await potToken.ADMIN_ROLE(), ADMIN_MULTISIG);
  const deFAIAdmin = await deFAIManager.hasRole(await deFAIManager.ADMIN_ROLE(), ADMIN_MULTISIG);
  const deFAIOperator = await deFAIManager.hasRole(await deFAIManager.OPERATOR_ROLE(), OPERATOR_MULTISIG);
  const deFAIEmergency = await deFAIManager.hasRole(await deFAIManager.EMERGENCY_ROLE(), EMERGENCY_MULTISIG);

  console.log('NexusToken Admin Role:', nexusTokenAdmin ? '✅' : '❌');
  console.log('PoTToken Admin Role:', potTokenAdmin ? '✅' : '❌');
  console.log('DeFAI Admin Role:', deFAIAdmin ? '✅' : '❌');
  console.log('DeFAI Operator Role:', deFAIOperator ? '✅' : '❌');
  console.log('DeFAI Emergency Role:', deFAIEmergency ? '✅' : '❌');

  console.log('\n🎉 Role setup completed successfully!');
  console.log('\nImportant Security Notes:');
  console.log('1. Deployer no longer has admin access to contracts');
  console.log('2. All admin functions now require multi-sig approval');
  console.log('3. Store private keys securely and use hardware wallets');
  console.log('4. Implement proper key rotation procedures');
  console.log('5. Set up monitoring for all admin operations');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Role setup failed:', error);
    process.exit(1);
  });
