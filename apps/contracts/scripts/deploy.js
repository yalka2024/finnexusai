import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log('Starting deployment...');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  // Get the contract factories
  const NexusToken = await ethers.getContractFactory('NexusToken');
  const PoTToken = await ethers.getContractFactory('PoTToken');
  const DeFAIManager = await ethers.getContractFactory('DeFAIManager');

  // Set fee recipient (using deployer as initial fee recipient)
  const feeRecipient = deployer.address;
  console.log('Fee recipient:', feeRecipient);

  // Deploy contracts
  console.log('Deploying NexusToken...');
  const nexusToken = await NexusToken.deploy(feeRecipient);
  await nexusToken.waitForDeployment();
  console.log('NexusToken deployed to:', await nexusToken.getAddress());

  console.log('Deploying PoTToken...');
  const potToken = await PoTToken.deploy();
  await potToken.waitForDeployment();
  console.log('PoTToken deployed to:', await potToken.getAddress());

  console.log('Deploying DeFAIManager...');
  const deFAIManager = await DeFAIManager.deploy(
    await nexusToken.getAddress(),
    await potToken.getAddress(),
    feeRecipient
  );
  await deFAIManager.waitForDeployment();
  console.log('DeFAIManager deployed to:', await deFAIManager.getAddress());

  console.log('Deployment completed successfully!');
  
  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      NexusToken: await nexusToken.getAddress(),
      PoTToken: await potToken.getAddress(),
      DeFAIManager: await deFAIManager.getAddress(),
    },
    timestamp: new Date().toISOString(),
  };

  console.log('Deployment Info:', JSON.stringify(deploymentInfo, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
