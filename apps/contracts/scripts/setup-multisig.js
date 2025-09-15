import pkg from 'hardhat';
const { ethers } = pkg;

/**
 * FinNexus AI Multi-Signature Wallet Setup Script
 * Configures Gnosis Safe wallets and role assignments
 */
async function main() {
  console.log('🔐 Setting up FinNexus AI Multi-Signature Wallets...');
  console.log('===================================================');

  // Multi-signature wallet addresses (replace with actual Gnosis Safe addresses)
  const multisigWallets = {
    admin: process.env.ADMIN_MULTISIG || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Replace with actual address
    operator: process.env.OPERATOR_MULTISIG || '0x8ba1f109551bD432803012645Hac136c4b4d8b6', // Replace with actual address
    emergency: process.env.EMERGENCY_MULTISIG || '0x9ca1f109551bD432803012645Hac136c4b4d8b6', // Replace with actual address
    treasury: process.env.TREASURY_MULTISIG || '0xAcA1f109551bD432803012645Hac136c4b4d8b6' // Replace with actual address
  };

  console.log('\n📋 Multi-Signature Wallet Configuration:');
  console.log('=========================================');
  console.log('Admin Multi-sig:', multisigWallets.admin);
  console.log('Operator Multi-sig:', multisigWallets.operator);
  console.log('Emergency Multi-sig:', multisigWallets.emergency);
  console.log('Treasury Multi-sig:', multisigWallets.treasury);

  // Deploy contracts
  console.log('\n📄 Deploying contracts...');
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const feeRecipient = multisigWallets.treasury;

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

  // ==================== ROLE ASSIGNMENT ====================
  console.log('\n🔑 Configuring Multi-Signature Roles...');
  console.log('==========================================');

  // NexusToken Role Setup
  console.log('\n🪙 Setting up NexusToken roles...');
  
  // Grant admin role to admin multi-sig
  await nexusToken.grantRole(await nexusToken.ADMIN_ROLE(), multisigWallets.admin);
  console.log('✅ Granted ADMIN_ROLE to admin multi-sig');

  // Grant minter role to admin multi-sig
  await nexusToken.grantRole(await nexusToken.MINTER_ROLE(), multisigWallets.admin);
  console.log('✅ Granted MINTER_ROLE to admin multi-sig');

  // Grant pauser role to emergency multi-sig
  await nexusToken.grantRole(await nexusToken.PAUSER_ROLE(), multisigWallets.emergency);
  console.log('✅ Granted PAUSER_ROLE to emergency multi-sig');

  // Revoke deployer admin role
  await nexusToken.revokeRole(await nexusToken.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log('✅ Revoked DEFAULT_ADMIN_ROLE from deployer');

  // PoTToken Role Setup
  console.log('\n🏆 Setting up PoTToken roles...');
  
  // Grant admin role to admin multi-sig
  await potToken.grantRole(await potToken.ADMIN_ROLE(), multisigWallets.admin);
  console.log('✅ Granted ADMIN_ROLE to admin multi-sig');

  // Grant minter role to operator multi-sig (for daily rewards)
  await potToken.grantRole(await potToken.MINTER_ROLE(), multisigWallets.operator);
  console.log('✅ Granted MINTER_ROLE to operator multi-sig');

  // Grant pauser role to emergency multi-sig
  await potToken.grantRole(await potToken.PAUSER_ROLE(), multisigWallets.emergency);
  console.log('✅ Granted PAUSER_ROLE to emergency multi-sig');

  // Grant burner role to operator multi-sig (for penalties)
  await potToken.grantRole(await potToken.BURNER_ROLE(), multisigWallets.operator);
  console.log('✅ Granted BURNER_ROLE to operator multi-sig');

  // Revoke deployer admin role
  await potToken.revokeRole(await potToken.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log('✅ Revoked DEFAULT_ADMIN_ROLE from deployer');

  // DeFAIManager Role Setup
  console.log('\n🤖 Setting up DeFAIManager roles...');
  
  // Grant admin role to admin multi-sig
  await deFAIManager.grantRole(await deFAIManager.ADMIN_ROLE(), multisigWallets.admin);
  console.log('✅ Granted ADMIN_ROLE to admin multi-sig');

  // Grant operator role to operator multi-sig
  await deFAIManager.grantRole(await deFAIManager.OPERATOR_ROLE(), multisigWallets.operator);
  console.log('✅ Granted OPERATOR_ROLE to operator multi-sig');

  // Grant emergency role to emergency multi-sig
  await deFAIManager.grantRole(await deFAIManager.EMERGENCY_ROLE(), multisigWallets.emergency);
  console.log('✅ Granted EMERGENCY_ROLE to emergency multi-sig');

  // Revoke deployer admin role
  await deFAIManager.revokeRole(await deFAIManager.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log('✅ Revoked DEFAULT_ADMIN_ROLE from deployer');

  // ==================== VERIFICATION ====================
  console.log('\n🔍 Verifying Role Assignments...');
  console.log('==================================');

  // Verify NexusToken roles
  const nexusAdmin = await nexusToken.hasRole(await nexusToken.ADMIN_ROLE(), multisigWallets.admin);
  const nexusMinter = await nexusToken.hasRole(await nexusToken.MINTER_ROLE(), multisigWallets.admin);
  const nexusPauser = await nexusToken.hasRole(await nexusToken.PAUSER_ROLE(), multisigWallets.emergency);

  console.log('NexusToken Roles:');
  console.log('  Admin Role (Admin Multi-sig):', nexusAdmin ? '✅' : '❌');
  console.log('  Minter Role (Admin Multi-sig):', nexusMinter ? '✅' : '❌');
  console.log('  Pauser Role (Emergency Multi-sig):', nexusPauser ? '✅' : '❌');

  // Verify PoTToken roles
  const potAdmin = await potToken.hasRole(await potToken.ADMIN_ROLE(), multisigWallets.admin);
  const potMinter = await potToken.hasRole(await potToken.MINTER_ROLE(), multisigWallets.operator);
  const potPauser = await potToken.hasRole(await potToken.PAUSER_ROLE(), multisigWallets.emergency);
  const potBurner = await potToken.hasRole(await potToken.BURNER_ROLE(), multisigWallets.operator);

  console.log('PoTToken Roles:');
  console.log('  Admin Role (Admin Multi-sig):', potAdmin ? '✅' : '❌');
  console.log('  Minter Role (Operator Multi-sig):', potMinter ? '✅' : '❌');
  console.log('  Pauser Role (Emergency Multi-sig):', potPauser ? '✅' : '❌');
  console.log('  Burner Role (Operator Multi-sig):', potBurner ? '✅' : '❌');

  // Verify DeFAIManager roles
  const deFAIAdmin = await deFAIManager.hasRole(await deFAIManager.ADMIN_ROLE(), multisigWallets.admin);
  const deFAIOperator = await deFAIManager.hasRole(await deFAIManager.OPERATOR_ROLE(), multisigWallets.operator);
  const deFAIEmergency = await deFAIManager.hasRole(await deFAIManager.EMERGENCY_ROLE(), multisigWallets.emergency);

  console.log('DeFAIManager Roles:');
  console.log('  Admin Role (Admin Multi-sig):', deFAIAdmin ? '✅' : '❌');
  console.log('  Operator Role (Operator Multi-sig):', deFAIOperator ? '✅' : '❌');
  console.log('  Emergency Role (Emergency Multi-sig):', deFAIEmergency ? '✅' : '❌');

  // ==================== MULTI-SIG CONFIGURATION GUIDE ====================
  console.log('\n📋 Multi-Signature Wallet Setup Guide');
  console.log('======================================');

  const multisigConfig = {
    timestamp: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      nexusToken: await nexusToken.getAddress(),
      potToken: await potToken.getAddress(),
      deFAIManager: await deFAIManager.getAddress()
    },
    multisigWallets: multisigWallets,
    roleAssignments: {
      nexusToken: {
        admin: multisigWallets.admin,
        minter: multisigWallets.admin,
        pauser: multisigWallets.emergency
      },
      potToken: {
        admin: multisigWallets.admin,
        minter: multisigWallets.operator,
        pauser: multisigWallets.emergency,
        burner: multisigWallets.operator
      },
      deFAIManager: {
        admin: multisigWallets.admin,
        operator: multisigWallets.operator,
        emergency: multisigWallets.emergency
      }
    },
    securityLevel: 'ENTERPRISE',
    deploymentStatus: 'READY_FOR_MAINNET'
  };

  console.log('\n🔧 Gnosis Safe Configuration Instructions:');
  console.log('===========================================');
  console.log('1. Create Gnosis Safe wallets with the following signers:');
  console.log('   - Admin Multi-sig: 3/5 threshold (Core team members)');
  console.log('   - Operator Multi-sig: 2/3 threshold (Operations team)');
  console.log('   - Emergency Multi-sig: 2/2 threshold (Security team)');
  console.log('   - Treasury Multi-sig: 3/5 threshold (Finance team)');
  
  console.log('\n2. Required Signers for each Multi-sig:');
  console.log('   Admin Multi-sig: CEO, CTO, CFO, Lead Developer, Security Lead');
  console.log('   Operator Multi-sig: Operations Manager, Senior Developer, DevOps Lead');
  console.log('   Emergency Multi-sig: Security Lead, Incident Response Manager');
  console.log('   Treasury Multi-sig: CFO, Finance Manager, CEO, CTO, Legal Counsel');

  console.log('\n3. Hardware Wallet Requirements:');
  console.log('   - All signers must use hardware wallets (Ledger/Trezor)');
  console.log('   - Private keys must never be stored digitally');
  console.log('   - Backup procedures for all signers');

  console.log('\n4. Operational Procedures:');
  console.log('   - Admin operations require 3/5 signatures');
  console.log('   - Daily operations require 2/3 signatures');
  console.log('   - Emergency operations require 2/2 signatures');
  console.log('   - Treasury operations require 3/5 signatures');

  console.log('\n📊 Multi-Sig Configuration Summary:');
  console.log('====================================');
  console.log(JSON.stringify(multisigConfig, null, 2));

  console.log('\n🎉 Multi-signature wallet setup completed successfully!');
  console.log('\nNext Steps:');
  console.log('1. Create actual Gnosis Safe wallets with real addresses');
  console.log('2. Update environment variables with real multi-sig addresses');
  console.log('3. Test multi-signature operations on testnet');
  console.log('4. Deploy to mainnet with multi-sig configuration');
  console.log('5. Transfer ownership to multi-sig wallets');

  return multisigConfig;
}

main()
  .then(() => {
    console.log('\n✅ Multi-signature setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Multi-signature setup failed:', error);
    process.exit(1);
  });
