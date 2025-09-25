/**
 * SSL/TLS Certificate Management Service
 * Handles Let's Encrypt integration and certificate lifecycle management
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// const https = require('https');
const databaseManager = require('../../config/database');

class SSLManager {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.certificatesPath = process.env.CERTIFICATES_PATH || '/etc/ssl/certs';
    this.privateKeyPath = process.env.PRIVATE_KEY_PATH || '/etc/ssl/private';
    this.letsEncryptEmail = process.env.LETSENCRYPT_EMAIL;
    this.letsEncryptStaging = process.env.LETSENCRYPT_STAGING === 'true';
  }

  /**
   * Initialize SSL/TLS configuration
   */
  async initializeSSL() {
    try {
      // Check if certificates exist
      const hasValidCert = await this.checkCertificateValidity();

      if (!hasValidCert) {
        logger.info('No valid SSL certificate found, generating self-signed certificate...');
        await this.generateSelfSignedCertificate();
      }

      return {
        success: true,
        message: 'SSL/TLS initialized successfully',
        certificateValid: hasValidCert
      };
    } catch (error) {
      logger.error('SSL initialization error:', error);
      throw new Error(`SSL initialization failed: ${error.message}`);
    }
  }

  /**
   * Check certificate validity
   */
  async checkCertificateValidity() {
    try {
      const certPath = path.join(this.certificatesPath, 'server.crt');
      const keyPath = path.join(this.privateKeyPath, 'server.key');

      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        return false;
      }

      const cert = fs.readFileSync(certPath);
      const x509 = new crypto.X509Certificate(cert);

      // Check if certificate is not expired
      const now = new Date();
      const validTo = new Date(x509.validTo);

      if (validTo <= now) {
        logger.info('Certificate has expired');
        return false;
      }

      // Check if certificate expires within 30 days
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (validTo <= thirtyDaysFromNow) {
        logger.info('Certificate expires within 30 days, renewal needed');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Certificate validity check error:', error);
      return false;
    }
  }

  /**
   * Generate self-signed certificate for development
   */
  async generateSelfSignedCertificate() {
    try {
      const { execSync } = require('child_process');

      // Ensure directories exist
      if (!fs.existsSync(this.certificatesPath)) {
        fs.mkdirSync(this.certificatesPath, { recursive: true, mode: 0o755 });
      }
      if (!fs.existsSync(this.privateKeyPath)) {
        fs.mkdirSync(this.privateKeyPath, { recursive: true, mode: 0o700 });
      }

      const certPath = path.join(this.certificatesPath, 'server.crt');
      const keyPath = path.join(this.privateKeyPath, 'server.key');

      // Generate private key
      execSync(`openssl genrsa -out "${keyPath}" 2048`);

      // Generate certificate
      const config = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C=US
ST=State
L=City
O=FinNexusAI
OU=IT Department
CN=localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
`;

      const configPath = path.join(__dirname, 'ssl-config.conf');
      fs.writeFileSync(configPath, config);

      execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -config "${configPath}"`);

      // Clean up config file
      fs.unlinkSync(configPath);

      // Set proper permissions
      fs.chmodSync(keyPath, 0o600);
      fs.chmodSync(certPath, 0o644);

      logger.info('Self-signed certificate generated successfully');
      return { certPath, keyPath };
    } catch (error) {
      logger.error('Self-signed certificate generation error:', error);
      throw new Error(`Failed to generate self-signed certificate: ${error.message}`);
    }
  }

  /**
   * Request Let's Encrypt certificate
   */
  async requestLetsEncryptCertificate(domain) {
    try {
      if (!this.letsEncryptEmail) {
        throw new Error('LETSENCRYPT_EMAIL environment variable not set');
      }

      const acme = require('acme-client');
      const logger = require('../../utils/logger');
      const client = new acme.Client({
        directoryUrl: this.letsEncryptStaging
          ? acme.directory.letsencrypt.staging
          : acme.directory.letsencrypt.production,
        accountKey: await acme.crypto.createPrivateKey()
      });

      // Create account
      const _account = await client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${this.letsEncryptEmail}`]
      });

      // Create order
      const order = await client.createOrder({
        identifiers: [
          { type: 'dns', value: domain }
        ]
      });

      // Get authorization
      const authorizations = await client.getAuthorizations(order);

      // Complete challenge (this would need to be implemented based on your setup)
      for (const authz of authorizations) {
        const challenge = authz.challenges.find(c => c.type === 'http-01');
        if (challenge) {
          await this.completeHTTPChallenge(challenge, client);
        }
      }

      // Finalize order
      const [key, csr] = await acme.crypto.createCsr({
        commonName: domain
      });

      await client.finalizeOrder(order, csr);

      // Get certificate
      const cert = await client.getCertificate(order);

      // Save certificate
      await this.saveCertificate(cert, key, domain);

      return {
        success: true,
        message: 'Let\'s Encrypt certificate obtained successfully',
        domain: domain
      };
    } catch (error) {
      logger.error('Let\'s Encrypt certificate request error:', error);
      throw new Error(`Failed to obtain Let's Encrypt certificate: ${error.message}`);
    }
  }

  /**
   * Complete HTTP challenge for Let's Encrypt
   */
  async completeHTTPChallenge(challenge, client) {
    // This is a simplified implementation
    // In production, you'd need to serve the challenge response
    const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

    // Store challenge response for web server to serve
    const challengePath = path.join(__dirname, '..', '..', 'public', '.well-known', 'acme-challenge');
    if (!fs.existsSync(challengePath)) {
      fs.mkdirSync(challengePath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(challengePath, challenge.token),
      keyAuthorization
    );

    // Notify Let's Encrypt that challenge is ready
    await client.verifyChallenge(challenge);
    await client.completeChallenge(challenge);

    // Wait for challenge to be verified
    await client.waitForValidStatus(challenge);
  }

  /**
   * Save certificate to filesystem and database
   */
  async saveCertificate(cert, privateKey, domain) {
    try {
      const certId = crypto.randomUUID();
      const certPath = path.join(this.certificatesPath, `${domain}.crt`);
      const keyPath = path.join(this.privateKeyPath, `${domain}.key`);

      // Save to filesystem
      fs.writeFileSync(certPath, cert);
      fs.writeFileSync(keyPath, privateKey);

      // Set proper permissions
      fs.chmodSync(keyPath, 0o600);
      fs.chmodSync(certPath, 0o644);

      // Save to database
      await this.postgres.query(`
        INSERT INTO certificates (
          id, name, type, domain, certificate_data, private_key_data,
          valid_from, valid_to, created_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), true)
        ON CONFLICT (domain) DO UPDATE SET
          certificate_data = EXCLUDED.certificate_data,
          private_key_data = EXCLUDED.private_key_data,
          valid_from = EXCLUDED.valid_from,
          valid_to = EXCLUDED.valid_to,
          updated_at = NOW()
      `, [
        certId,
        `Let's Encrypt - ${domain}`,
        'ssl',
        domain,
        cert,
        privateKey,
        new Date(),
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      ]);

      return { certPath, keyPath, certId };
    } catch (error) {
      logger.error('Save certificate error:', error);
      throw new Error(`Failed to save certificate: ${error.message}`);
    }
  }

  /**
   * Get SSL configuration for Express
   */
  getSSLConfig(domain = 'localhost') {
    try {
      const certPath = path.join(this.certificatesPath, `${domain}.crt`);
      const keyPath = path.join(this.privateKeyPath, `${domain}.key`);

      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        };
      }

      // Fallback to default certificate
      const defaultCertPath = path.join(this.certificatesPath, 'server.crt');
      const defaultKeyPath = path.join(this.privateKeyPath, 'server.key');

      if (fs.existsSync(defaultCertPath) && fs.existsSync(defaultKeyPath)) {
        return {
          key: fs.readFileSync(defaultKeyPath),
          cert: fs.readFileSync(defaultCertPath)
        };
      }

      throw new Error('No SSL certificate found');
    } catch (error) {
      logger.error('Get SSL config error:', error);
      throw error;
    }
  }

  /**
   * Monitor certificate expiration
   */
  async monitorCertificateExpiration() {
    try {
      const result = await this.postgres.query(`
        SELECT id, name, domain, valid_to, is_active
        FROM certificates
        WHERE is_active = true AND valid_to <= NOW() + INTERVAL '30 days'
        ORDER BY valid_to ASC
      `);

      const expiringCertificates = result.rows;

      if (expiringCertificates.length > 0) {
        logger.warn('Certificates expiring within 30 days:', expiringCertificates);

        // Trigger renewal process
        for (const cert of expiringCertificates) {
          await this.renewCertificate(cert.domain);
        }
      }

      return expiringCertificates;
    } catch (error) {
      logger.error('Certificate expiration monitoring error:', error);
      throw error;
    }
  }

  /**
   * Renew certificate
   */
  async renewCertificate(domain) {
    try {
      logger.info(`Renewing certificate for domain: ${domain}`);

      // For Let's Encrypt certificates, request a new one
      if (this.letsEncryptEmail) {
        await this.requestLetsEncryptCertificate(domain);
      } else {
        // For self-signed certificates, generate a new one
        await this.generateSelfSignedCertificate();
      }

      return {
        success: true,
        message: `Certificate renewed for domain: ${domain}`
      };
    } catch (error) {
      logger.error('Certificate renewal error:', error);
      throw new Error(`Failed to renew certificate for ${domain}: ${error.message}`);
    }
  }

  /**
   * Get certificate information
   */
  async getCertificateInfo(domain) {
    try {
      const certPath = path.join(this.certificatesPath, `${domain}.crt`);

      if (!fs.existsSync(certPath)) {
        throw new Error(`Certificate not found for domain: ${domain}`);
      }

      const cert = fs.readFileSync(certPath);
      const x509 = new crypto.X509Certificate(cert);

      return {
        subject: x509.subject,
        issuer: x509.issuer,
        validFrom: new Date(x509.validFrom),
        validTo: new Date(x509.validTo),
        serialNumber: x509.serialNumber,
        fingerprint: x509.fingerprint256,
        isExpired: new Date(x509.validTo) <= new Date(),
        daysUntilExpiry: Math.ceil((new Date(x509.validTo) - new Date()) / (1000 * 60 * 60 * 24))
      };
    } catch (error) {
      logger.error('Get certificate info error:', error);
      throw error;
    }
  }
}

module.exports = new SSLManager();
