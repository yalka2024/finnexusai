#!/usr/bin/env node

/**
 * Generate Production Secrets for FinAI Nexus
 * 
 * Generates secure random secrets for production deployment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecureSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

function generateSecurePassword(length = 24) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

console.log('🔐 Generating Production Secrets for FinAI Nexus...\n');

const secrets = {
  // Application Secrets
  JWT_SECRET: generateSecureSecret(32),
  ENCRYPTION_KEY: generateSecureSecret(32),
  SESSION_SECRET: generateSecureSecret(32),
  REFRESH_TOKEN_SECRET: generateSecureSecret(32),
  
  // Database Credentials
  POSTGRES_USER: 'finainexus_prod',
  POSTGRES_PASSWORD: generateSecurePassword(32),
  MONGODB_USER: 'finainexus_mongo',
  MONGODB_PASSWORD: generateSecurePassword(32),
  REDIS_PASSWORD: generateSecurePassword(24),
  
  // API Keys (Placeholders - Replace with actual keys)
  STRIPE_SECRET_KEY: 'sk_live_YOUR_STRIPE_SECRET_KEY',
  STRIPE_PUBLISHABLE_KEY: 'pk_live_YOUR_STRIPE_PUBLISHABLE_KEY',
  STRIPE_WEBHOOK_SECRET: 'whsec_YOUR_WEBHOOK_SECRET',
  OPENAI_SECRET_KEY: 'sk-YOUR_OPENAI_SECRET_KEY',
  
  // Email Configuration
  SMTP_USER: 'noreply@finainexus.com',
  SMTP_PASSWORD: 'YOUR_SMTP_PASSWORD',
  
  // Monitoring
  SENTRY_DSN: 'https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID'
};

// Generate .env.production file
const envContent = Object.entries(secrets)
  .map(([key, value]) => `${key}="${value}"`)
  .join('\n');

const envFile = `# FinAI Nexus Production Environment
# Generated: ${new Date().toISOString()}
# IMPORTANT: Keep this file secure and never commit to version control!

${envContent}

# Additional Production Configuration
NODE_ENV=production
PLATFORM_MODE=educational
EDUCATIONAL_DISCLAIMERS_ENABLED=true
FINANCIAL_SERVICES_DISABLED=true
SIMULATION_ONLY=true
`;

// Write to file
fs.writeFileSync('.env.production', envFile);

console.log('✅ Production secrets generated successfully!');
console.log('\n📋 Generated Secrets:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

Object.entries(secrets).forEach(([key, value]) => {
  if (key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY')) {
    console.log(`${key}: ${value.substring(0, 8)}...`);
  } else {
    console.log(`${key}: ${value}`);
  }
});

console.log('\n🔒 Security Instructions:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. ✅ .env.production file created with secure secrets');
console.log('2. ⚠️  NEVER commit .env.production to version control');
console.log('3. 🔑 Replace API key placeholders with actual keys');
console.log('4. 🏭 Use these secrets in your production deployment');
console.log('5. 🔄 Rotate secrets regularly (every 90 days)');

console.log('\n🚀 Next Steps:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. Update .env.production with your actual API keys');
console.log('2. Deploy using: docker-compose -f docker-compose.production.yml up -d');
console.log('3. Verify deployment: curl https://api.finainexus.com/health');
console.log('4. Set up monitoring and alerting');

console.log('\n🎯 Production Deployment Command:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('docker-compose -f docker-compose.production.yml up --build -d');

console.log('\n✅ Production secrets generation complete!\n');
