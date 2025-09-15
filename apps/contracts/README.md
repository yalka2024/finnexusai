# FinNexus AI Smart Contracts

This directory contains the smart contracts for the FinNexus AI DeFi platform, built with Solidity and Hardhat.

## Prerequisites

- **Node.js**: Version 20.10.0 or later (LTS recommended)
- **npm**: Version 10.0.0 or later

## Installation

1. Navigate to the contracts directory:
```bash
cd apps/contracts
```

2. Install dependencies:
```bash
npm install
```

## Project Structure

```
contracts/
├── DeFAIManager.sol      # Main DeFi AI manager contract
├── NexusToken.sol        # Native platform token
├── PoTToken.sol          # Proof of Trust token
├── scripts/
│   └── deploy.js         # Deployment script
├── test/
│   ├── basic.test.js     # Basic functionality tests
│   ├── edge.test.js      # Edge case tests
│   └── pot.test.js       # PoT token tests
├── hardhat.config.ts     # Hardhat configuration
├── package.json          # Project dependencies
└── tsconfig.json         # TypeScript configuration
```

## Available Scripts

- `npm run compile` - Compile smart contracts
- `npm run test` - Run test suite
- `npm run deploy` - Deploy to default network
- `npm run deploy:local` - Deploy to local network
- `npm run deploy:testnet` - Deploy to testnet
- `npm run deploy:mainnet` - Deploy to mainnet
- `npm run clean` - Clean build artifacts
- `npm run coverage` - Run coverage analysis
- `npm run size` - Analyze contract sizes

## Environment Variables

Create a `.env` file in the contracts directory with the following variables:

```env
# Network Configuration
TESTNET_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# Private Key (NEVER commit this to version control)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Gas Reporting
REPORT_GAS=true

# COINMARKETCAP_API_KEY for gas reporting in USD
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
```

## Usage

### Compiling Contracts

```bash
npm run compile
```

### Running Tests

```bash
npm run test
```

### Deploying Contracts

1. **Local Development**:
```bash
npm run deploy:local
```

2. **Testnet**:
```bash
npm run deploy:testnet
```

3. **Mainnet**:
```bash
npm run deploy:mainnet
```

## Contract Overview

### NexusToken.sol
- ERC20 token for the FinNexus AI platform
- Implements standard token functionality with additional features for DeFi operations

### PoTToken.sol
- Proof of Trust token implementation
- Used for reputation and trust scoring within the platform

### DeFAIManager.sol
- Main contract managing DeFi AI operations
- Handles portfolio management, risk assessment, and automated trading

## Security Considerations

- All contracts are designed with security best practices
- Comprehensive test coverage for edge cases
- Gas optimization for efficient deployment and usage
- Access control mechanisms for sensitive operations

## Development Workflow

1. Make changes to Solidity contracts
2. Update corresponding tests
3. Run test suite: `npm run test`
4. Compile contracts: `npm run compile`
5. Deploy to testnet for validation
6. Deploy to mainnet after thorough testing

## Contributing

1. Follow Solidity style guidelines
2. Add comprehensive tests for new functionality
3. Update documentation for contract changes
4. Ensure gas optimization for new features

## License

MIT License - see LICENSE file for details
