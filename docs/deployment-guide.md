# FinNexus AI Mainnet Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the FinNexus AI smart contracts to the Ethereum mainnet with enterprise-grade security and monitoring.

## Prerequisites

### Technical Requirements
- Node.js 20.10.0 or later
- npm 10.0.0 or later
- Hardhat development environment
- Access to Ethereum mainnet RPC endpoint
- Etherscan API key for contract verification

### Security Requirements
- Hardware wallet (Ledger, Trezor) for deployment
- Multi-signature wallet setup (Gnosis Safe recommended)
- Secure key management system
- Backup and recovery procedures

### Financial Requirements
- Sufficient ETH for deployment gas costs (estimate: 0.1-0.3 ETH)
- Emergency fund for potential issues
- Insurance coverage for smart contract risks

## Pre-Deployment Checklist

### 1. Security Audit
- [ ] Complete professional security audit
- [ ] Fix all critical and high-severity issues
- [ ] Review medium-severity issues
- [ ] Document audit findings
- [ ] Obtain audit report and certificate

### 2. Testing
- [ ] All unit tests passing (53/53)
- [ ] Integration tests completed
- [ ] Load testing performed
- [ ] Gas optimization verified
- [ ] Edge cases tested

### 3. Documentation
- [ ] Smart contract documentation complete
- [ ] API documentation updated
- [ ] User guides prepared
- [ ] Incident response procedures documented
- [ ] Emergency contact list prepared

### 4. Infrastructure
- [ ] Monitoring systems configured
- [ ] Alerting channels set up
- [ ] Backup systems in place
- [ ] Disaster recovery procedures tested
- [ ] Team access controls configured

## Deployment Process

### Step 1: Environment Setup

1. **Create deployment environment file:**
```bash
# .env.mainnet
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
ADMIN_MULTISIG=0x...your_admin_multisig_address
OPERATOR_MULTISIG=0x...your_operator_multisig_address
EMERGENCY_MULTISIG=0x...your_emergency_multisig_address
```

2. **Verify environment variables:**
```bash
npm run verify:env
```

### Step 2: Pre-Deployment Verification

1. **Run final test suite:**
```bash
npm run test:mainnet
```

2. **Verify gas estimates:**
```bash
npm run gas:estimate
```

3. **Check network connectivity:**
```bash
npm run check:network
```

### Step 3: Deploy Contracts

1. **Deploy to mainnet:**
```bash
npx hardhat run scripts/deploy-mainnet.js --network mainnet
```

2. **Verify deployment:**
```bash
npx hardhat verify --network mainnet
```

3. **Setup contract roles:**
```bash
npx hardhat run scripts/setup-roles.js --network mainnet
```

### Step 4: Post-Deployment Verification

1. **Verify contract functionality:**
```bash
npm run verify:deployment
```

2. **Test critical functions:**
```bash
npm run test:mainnet:functions
```

3. **Check contract verification:**
```bash
npm run verify:etherscan
```

## Contract Addresses

After deployment, record the following addresses:

```javascript
// Mainnet Contract Addresses
const CONTRACTS = {
  nexusToken: '0x...',
  potToken: '0x...',
  deFAIManager: '0x...'
};
```

## Security Configuration

### Multi-Signature Setup

1. **Admin Multi-sig (Gnosis Safe):**
   - Required confirmations: 3/5
   - Signers: Core team members
   - Functions: Contract upgrades, role management

2. **Operator Multi-sig:**
   - Required confirmations: 2/3
   - Signers: Operations team
   - Functions: Daily operations, yield optimization

3. **Emergency Multi-sig:**
   - Required confirmations: 2/2
   - Signers: Security team
   - Functions: Emergency pauses, withdrawals

### Role Management

```bash
# Grant admin role to multi-sig
npx hardhat run scripts/grant-admin-role.js --network mainnet

# Grant operator role to multi-sig
npx hardhat run scripts/grant-operator-role.js --network mainnet

# Grant emergency role to multi-sig
npx hardhat run scripts/grant-emergency-role.js --network mainnet
```

## Monitoring Setup

### 1. Contract Monitoring

```javascript
// Start monitoring
const monitor = new ContractMonitor({
  contracts: {
    rpcUrl: process.env.MAINNET_RPC_URL,
    privateKey: process.env.MONITORING_KEY,
    contractAddresses: CONTRACTS
  },
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK
  },
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    recipients: ['admin@finnexus.ai']
  },
  alertThresholds: {
    largeTransfer: '10000', // 10k NEXUS tokens
    highGasPrice: '100', // 100 gwei
    failedTransactions: 5,
    contractPaused: true,
    emergencyWithdrawals: true
  }
});

monitor.startMonitoring();
```

### 2. Health Checks

Set up automated health checks for:
- Contract functionality
- Token balances
- Gas prices
- Network connectivity
- Event processing

### 3. Alerting Channels

Configure alerts for:
- **Critical:** Contract pauses, emergency withdrawals
- **Warning:** High gas prices, large transfers
- **Info:** Daily operations, yield optimizations

## Integration Setup

### Backend Integration

1. **Update configuration:**
```javascript
// backend/src/config/contracts.js
module.exports = {
  mainnet: {
    nexusToken: '0x...',
    potToken: '0x...',
    deFAIManager: '0x...',
    rpcUrl: process.env.MAINNET_RPC_URL,
    privateKey: process.env.BACKEND_KEY
  }
};
```

2. **Initialize contracts:**
```javascript
const FinNexusContracts = require('./contracts/FinNexusContracts');
const contracts = new FinNexusContracts(config.mainnet);
```

### Frontend Integration

1. **Update contract addresses:**
```javascript
// frontend/src/config/contracts.js
export const CONTRACT_ADDRESSES = {
  nexusToken: '0x...',
  potToken: '0x...',
  deFAIManager: '0x...'
};
```

2. **Configure Web3 provider:**
```javascript
// frontend/src/utils/web3.js
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_MAINNET_RPC);
const contracts = new FinNexusContracts({
  provider,
  contractAddresses: CONTRACT_ADDRESSES
});
```

## Post-Deployment Operations

### 1. Initial Token Distribution

```bash
# Mint initial tokens for platform operations
npx hardhat run scripts/mint-initial-tokens.js --network mainnet
```

### 2. Yield Strategy Setup

```bash
# Add initial yield strategies
npx hardhat run scripts/setup-yield-strategies.js --network mainnet
```

### 3. User Onboarding

```bash
# Create initial user portfolios
npx hardhat run scripts/create-initial-portfolios.js --network mainnet
```

## Emergency Procedures

### 1. Contract Pause

If emergency pause is needed:

```bash
# Pause all contracts
npx hardhat run scripts/emergency-pause.js --network mainnet
```

### 2. Emergency Withdrawal

For emergency fund recovery:

```bash
# Emergency withdrawal
npx hardhat run scripts/emergency-withdrawal.js --network mainnet
```

### 3. Incident Response

1. **Immediate Response (0-15 minutes):**
   - Assess severity
   - Activate incident response team
   - Implement emergency procedures if needed

2. **Investigation (15-60 minutes):**
   - Analyze transaction logs
   - Identify root cause
   - Assess impact

3. **Resolution (1-24 hours):**
   - Implement fix
   - Test solution
   - Deploy update if needed

4. **Communication:**
   - Notify users
   - Update status page
   - Post-mortem analysis

## Maintenance Schedule

### Daily
- [ ] Check contract health
- [ ] Review monitoring alerts
- [ ] Monitor gas prices
- [ ] Check user transactions

### Weekly
- [ ] Review yield performance
- [ ] Update risk profiles
- [ ] Check contract balances
- [ ] Review security logs

### Monthly
- [ ] Full security audit
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Disaster recovery testing

## Support and Contacts

### Emergency Contacts
- **Security Team:** security@finnexus.ai
- **Operations Team:** ops@finnexus.ai
- **Technical Lead:** tech@finnexus.ai

### External Contacts
- **Audit Firm:** audit@firm.com
- **Legal Counsel:** legal@firm.com
- **Insurance Provider:** insurance@provider.com

## Compliance and Legal

### Regulatory Compliance
- [ ] KYC/AML procedures implemented
- [ ] Regulatory reporting configured
- [ ] Compliance monitoring active
- [ ] Legal review completed

### Insurance Coverage
- [ ] Smart contract insurance active
- [ ] Directors and officers insurance
- [ ] Cyber liability insurance
- [ ] Business interruption insurance

## Success Metrics

### Technical Metrics
- Contract uptime: >99.9%
- Transaction success rate: >99.5%
- Gas optimization: <20% above estimated
- Response time: <5 seconds

### Business Metrics
- User adoption rate
- Total value locked (TVL)
- Yield performance
- User satisfaction score

## Conclusion

This deployment guide ensures a secure, monitored, and compliant deployment of the FinNexus AI platform. Follow all steps carefully and maintain the highest security standards throughout the process.

For questions or issues, contact the development team at dev@finnexus.ai.
