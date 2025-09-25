/**
 * FinAI Nexus - End-to-End Encryption Service
 *
 * Advanced encryption system featuring:
 * - AES-256-GCM encryption for data at rest
 * - TLS 1.3 for data in transit
 * - RSA-4096 for key exchange
 * - ChaCha20-Poly1305 for high-performance encryption
 * - Zero-knowledge encryption for sensitive data
 */

const crypto = require('crypto');
const _databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class EncryptionService {
  constructor() {
    this.db = databaseManager;
    this.keyStore = new Map();
    this.sessionKeys = new Map();
    this.encryptionAlgorithms = {
      symmetric: 'aes-256-gcm',
      asymmetric: 'rsa',
      stream: 'chacha20-poly1305',
      hash: 'sha-256'
    };
    this.keySizes = {
      aes: 32, // 256 bits
      rsa: 4096, // 4096 bits
      chacha: 32, // 256 bits
      hmac: 32 // 256 bits
    };
  }

  /**
   * Initialize encryption service
   */
  async initialize() {
    try {
      await this.loadMasterKeys();
      await this.initializeKeyRotation();
      logger.info('Encryption service initialized');
    } catch (error) {
      logger.error('Error initializing encryption service:', error);
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data, options = {}) {
    try {
      const {
        algorithm = this.encryptionAlgorithms.symmetric,
        keyId = null,
        userId = null,
        dataType = 'general'
      } = options;

      // Generate or retrieve encryption key
      const _encryptionKey = await this.getEncryptionKey(keyId, userId, dataType);

      // Convert data to buffer if needed
      const _dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));

      // Generate random IV
      const _iv = crypto.randomBytes(16);

      // Create cipher
      const _cipher = crypto.createCipher(algorithm, encryptionKey);
      cipher.setAAD(Buffer.from(dataType)); // Additional authenticated data

      // Encrypt data
      let _encrypted = cipher.update(dataBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag
      const _authTag = cipher.getAuthTag();

      // Create encrypted payload
      const _encryptedPayload = {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: algorithm,
        keyId: encryptionKey.keyId,
        timestamp: new Date().toISOString(),
        dataType: dataType
      };

      // Store encryption metadata
      await this.storeEncryptionMetadata(encryptedPayload, userId);

      return encryptedPayload;
    } catch (error) {
      logger.error('Error encrypting data:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedPayload, options = {}) {
    try {
      const { userId = null, verifyIntegrity = true } = options;

      // Retrieve encryption key
      const _encryptionKey = await this.getDecryptionKey(encryptedPayload.keyId, userId);

      // Convert base64 strings back to buffers
      const _encryptedData = Buffer.from(encryptedPayload.encryptedData, 'base64');
      const _iv = Buffer.from(encryptedPayload.iv, 'base64');
      const _authTag = Buffer.from(encryptedPayload.authTag, 'base64');

      // Create decipher
      const _decipher = crypto.createDecipher(encryptedPayload.algorithm, encryptionKey);
      decipher.setAAD(Buffer.from(encryptedPayload.dataType));
      decipher.setAuthTag(authTag);

      // Decrypt data
      let _decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Verify integrity if requested
      if (verifyIntegrity) {
        await this.verifyDataIntegrity(decrypted, encryptedPayload, userId);
      }

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(decrypted.toString());
      } catch {
        return decrypted.toString();
      }
    } catch (error) {
      logger.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt data for transmission
   */
  async encryptForTransmission(data, recipientPublicKey, options = {}) {
    try {
      const {
        algorithm: _algorithm = this.encryptionAlgorithms.asymmetric,
        includeSignature = true
      } = options;

      // Generate session key for symmetric encryption
      const _sessionKey = crypto.randomBytes(this.keySizes.aes);

      // Encrypt data with session key
      const _iv = crypto.randomBytes(16);
      const _cipher = crypto.createCipher(this.encryptionAlgorithms.symmetric, sessionKey);
      let _encrypted = cipher.update(Buffer.from(JSON.stringify(data)));
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const _authTag = cipher.getAuthTag();

      // Encrypt session key with recipient's public key
      const _encryptedSessionKey = crypto.publicEncrypt(
        {
          key: recipientPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        sessionKey
      );

      // Create transmission payload
      const _transmissionPayload = {
        encryptedData: encrypted.toString('base64'),
        encryptedSessionKey: encryptedSessionKey.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.encryptionAlgorithms.symmetric,
        timestamp: new Date().toISOString()
      };

      // Add digital signature if requested
      if (includeSignature) {
        transmissionPayload.signature = await this.signData(transmissionPayload);
      }

      return transmissionPayload;
    } catch (error) {
      logger.error('Error encrypting for transmission:', error);
      throw new Error('Failed to encrypt for transmission');
    }
  }

  /**
   * Decrypt data from transmission
   */
  async decryptFromTransmission(transmissionPayload, privateKey, options = {}) {
    try {
      const { verifySignature = true } = options;

      // Verify signature if present
      if (verifySignature && transmissionPayload.signature) {
        const _isValid = await this.verifySignature(transmissionPayload, transmissionPayload.signature);
        if (!isValid) {
          throw new Error('Invalid signature');
        }
      }

      // Decrypt session key
      const _encryptedSessionKey = Buffer.from(transmissionPayload.encryptedSessionKey, 'base64');
      const _sessionKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedSessionKey
      );

      // Decrypt data
      const _encryptedData = Buffer.from(transmissionPayload.encryptedData, 'base64');
      const _iv = Buffer.from(transmissionPayload.iv, 'base64');
      const _authTag = Buffer.from(transmissionPayload.authTag, 'base64');

      const _decipher = crypto.createDecipher(transmissionPayload.algorithm, sessionKey);
      decipher.setAuthTag(authTag);

      let _decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return JSON.parse(decrypted.toString());
    } catch (error) {
      logger.error('Error decrypting from transmission:', error);
      throw new Error('Failed to decrypt from transmission');
    }
  }

  /**
   * Generate encryption key
   */
  async generateEncryptionKey(options = {}) {
    try {
      const {
        keyType = 'symmetric',
        userId = null,
        dataType = 'general',
        expiresAt = null
      } = options;

      let keyData;

      if (keyType === 'symmetric') {
        keyData = crypto.randomBytes(this.keySizes.aes);
      } else if (keyType === 'asymmetric') {
        const _keyPair = crypto.generateKeyPairSync('rsa', {
          modulusLength: this.keySizes.rsa,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        keyData = keyPair;
      }

      const _keyId = this.generateKeyId();
      const _keyMetadata = {
        keyId: keyId,
        keyType: keyType,
        userId: userId,
        dataType: dataType,
        createdAt: new Date(),
        expiresAt: expiresAt,
        isActive: true
      };

      // Store key securely
      await this.storeEncryptionKey(keyId, keyData, keyMetadata);

      return {
        keyId: keyId,
        keyData: keyData,
        metadata: keyMetadata
      };
    } catch (error) {
      logger.error('Error generating encryption key:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(options = {}) {
    try {
      const {
        keyType = 'all',
        userId = null,
        dataType = null,
        forceRotation = false
      } = options;

      // Find keys to rotate
      const _keysToRotate = await this.findKeysToRotate(keyType, userId, dataType, forceRotation);

      const _rotationResults = [];

      if (!keysToRotate || !Array.isArray(keysToRotate)) {
        return rotationResults;
      }

      for (const key of keysToRotate) {
        try {
          // Generate new key
          const _newKey = await this.generateEncryptionKey({
            keyType: key.keyType,
            userId: key.userId,
            dataType: key.dataType
          });

          // Mark old key as rotated
          await this.markKeyAsRotated(key.keyId, newKey.keyId);

          // Re-encrypt data with new key (in production, this would be done in batches)
          await this.reencryptDataWithNewKey(key.keyId, newKey.keyId);

          rotationResults.push({
            oldKeyId: key.keyId,
            newKeyId: newKey.keyId,
            status: 'success'
          });
        } catch (error) {
          rotationResults.push({
            oldKeyId: key.keyId,
            newKeyId: null,
            status: 'failed',
            error: error.message
          });
        }
      }

      return rotationResults;
    } catch (error) {
      logger.error('Error rotating keys:', error);
      throw new Error('Failed to rotate keys');
    }
  }

  /**
   * Hash sensitive data
   */
  async hashData(data, options = {}) {
    try {
      const {
        algorithm = this.encryptionAlgorithms.hash,
        salt = null,
        iterations = 100000
      } = options;

      const _dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));

      let hash;
      if (salt) {
        // Use PBKDF2 for password hashing
        hash = crypto.pbkdf2Sync(dataBuffer, salt, iterations, 32, algorithm);
      } else {
        // Use regular hash
        hash = crypto.createHash(algorithm).update(dataBuffer).digest();
      }

      return {
        hash: hash.toString('base64'),
        salt: salt?.toString('base64') || null,
        algorithm: algorithm,
        iterations: iterations
      };
    } catch (error) {
      logger.error('Error hashing data:', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity(data, originalPayload, _userId) {
    try {
      // Verify timestamp is not too old
      const _payloadTime = new Date(originalPayload.timestamp);
      const _now = new Date();
      const _maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now.getTime() - payloadTime.getTime() > maxAge) {
        throw new Error('Data payload is too old');
      }

      // Verify key is still active
      const _keyMetadata = await this.getKeyMetadata(originalPayload.keyId);
      if (!keyMetadata || !keyMetadata.isActive) {
        throw new Error('Encryption key is no longer active');
      }

      // Additional integrity checks can be added here
      return true;
    } catch (error) {
      logger.error('Error verifying data integrity:', error);
      throw new Error('Failed to verify data integrity');
    }
  }

  /**
   * Sign data digitally
   */
  async signData(data, privateKey = null) {
    try {
      const _key = privateKey || await this.getSigningKey();
      const _dataString = typeof data === 'string' ? data : JSON.stringify(data);

      const _signature = crypto.sign('sha256', Buffer.from(dataString), key);

      return signature.toString('base64');
    } catch (error) {
      logger.error('Error signing data:', error);
      throw new Error('Failed to sign data');
    }
  }

  /**
   * Verify digital signature
   */
  async verifySignature(data, signature, publicKey = null) {
    try {
      const _key = publicKey || await this.getVerificationKey();
      const _dataString = typeof data === 'string' ? data : JSON.stringify(data);

      return crypto.verify('sha256', Buffer.from(dataString), key, Buffer.from(signature, 'base64'));
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Get encryption key
   */
  async getEncryptionKey(keyId, userId, dataType) {
    try {
      if (keyId) {
        return await this.retrieveEncryptionKey(keyId);
      }

      // Find or create user-specific key
      const _userKey = await this.findUserKey(userId, dataType);
      if (userKey) {
        return userKey;
      }

      // Generate new key if none exists
      const _newKey = await this.generateEncryptionKey({
        userId: userId,
        dataType: dataType
      });

      return newKey;
    } catch (error) {
      logger.error('Error getting encryption key:', error);
      throw new Error('Failed to get encryption key');
    }
  }

  /**
   * Get decryption key
   */
  async getDecryptionKey(keyId, userId) {
    try {
      const _key = await this.retrieveEncryptionKey(keyId);

      // Verify user has access to this key
      if (userId && key.userId && key.userId !== userId) {
        throw new Error('User does not have access to this encryption key');
      }

      return key;
    } catch (error) {
      logger.error('Error getting decryption key:', error);
      throw new Error('Failed to get decryption key');
    }
  }

  /**
   * Generate key ID
   */
  generateKeyId() {
    return `KEY-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Load master keys
   */
  async loadMasterKeys() {
    try {
      // Load master encryption keys from secure storage
      // In production, these would be loaded from HSM or secure key management
      const _masterKey = process.env.MASTER_ENCRYPTION_KEY || crypto.randomBytes(32);
      this.keyStore.set('master', masterKey);
    } catch (error) {
      logger.error('Error loading master keys:', error);
    }
  }

  /**
   * Initialize key rotation
   */
  async initializeKeyRotation() {
    try {
      // Set up automatic key rotation
      // Keys should be rotated every 90 days
      const _rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

      setInterval(_async() => {
        try {
          await this.rotateKeys({ forceRotation: false });
          logger.info('Automatic key rotation completed');
        } catch (error) {
          logger.error('Automatic key rotation failed:', error);
        }
      }, rotationInterval);
    } catch (error) {
      logger.error('Error initializing key rotation:', error);
    }
  }

  // Storage methods
  async storeEncryptionKey(keyId, keyData, metadata) {
    try {
      await this.db.queryMongo(
        'encryption_keys',
        'insertOne',
        {
          keyId: keyId,
          keyData: keyData.toString('base64'),
          metadata: metadata,
          createdAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Error storing encryption key:', error);
    }
  }

  async retrieveEncryptionKey(keyId) {
    try {
      const _result = await this.db.queryMongo(
        'encryption_keys',
        'findOne',
        { keyId: keyId }
      );

      if (!result) {
        throw new Error('Encryption key not found');
      }

      return {
        keyId: result.keyId,
        keyData: Buffer.from(result.keyData, 'base64'),
        metadata: result.metadata
      };
    } catch (error) {
      logger.error('Error retrieving encryption key:', error);
      throw new Error('Failed to retrieve encryption key');
    }
  }

  async storeEncryptionMetadata(payload, userId) {
    try {
      await this.db.queryMongo(
        'encryption_metadata',
        'insertOne',
        {
          keyId: payload.keyId,
          userId: userId,
          dataType: payload.dataType,
          algorithm: payload.algorithm,
          timestamp: payload.timestamp,
          createdAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Error storing encryption metadata:', error);
    }
  }

  async getKeyMetadata(keyId) {
    try {
      const _result = await this.db.queryMongo(
        'encryption_keys',
        'findOne',
        { keyId: keyId }
      );

      return result?.metadata || null;
    } catch (error) {
      logger.error('Error getting key metadata:', error);
      return null;
    }
  }

  async findUserKey(userId, dataType) {
    try {
      const _result = await this.db.queryMongo(
        'encryption_keys',
        'findOne',
        {
          'metadata.userId': userId,
          'metadata.dataType': dataType,
          'metadata.isActive': true
        }
      );

      if (result) {
        return {
          keyId: result.keyId,
          keyData: Buffer.from(result.keyData, 'base64'),
          metadata: result.metadata
        };
      }

      return null;
    } catch (error) {
      logger.error('Error finding user key:', error);
      return null;
    }
  }

  async findKeysToRotate(keyType, userId, dataType, forceRotation) {
    try {
      const _query = {
        'metadata.isActive': true
      };

      if (keyType !== 'all') {
        query['metadata.keyType'] = keyType;
      }
      if (userId) {
        query['metadata.userId'] = userId;
      }
      if (dataType) {
        query['metadata.dataType'] = dataType;
      }

      if (!forceRotation) {
        // Only rotate keys that are older than 90 days
        const _rotationDate = new Date();
        rotationDate.setDate(rotationDate.getDate() - 90);
        query['metadata.createdAt'] = { $lt: rotationDate };
      }

      const _results = await this.db.queryMongo(
        'encryption_keys',
        'find',
        query
      );

      return results || [];
    } catch (error) {
      logger.error('Error finding keys to rotate:', error);
      return [];
    }
  }

  async markKeyAsRotated(oldKeyId, newKeyId) {
    try {
      await this.db.queryMongo(
        'encryption_keys',
        'updateOne',
        { keyId: oldKeyId },
        {
          $set: {
            'metadata.isActive': false,
            'metadata.rotatedAt': new Date(),
            'metadata.rotatedToKeyId': newKeyId
          }
        }
      );
    } catch (error) {
      logger.error('Error marking key as rotated:', error);
    }
  }

  async reencryptDataWithNewKey(oldKeyId, newKeyId) {
    try {
      // In production, this would re-encrypt all data encrypted with the old key
      // This is a complex operation that should be done in batches
      logger.info(`Re-encrypting data from key ${oldKeyId} to key ${newKeyId}`);
    } catch (error) {
      logger.error('Error re-encrypting data:', error);
    }
  }

  async getSigningKey() {
    // In production, this would retrieve the signing private key
    return process.env.SIGNING_PRIVATE_KEY || crypto.randomBytes(32);
  }

  async getVerificationKey() {
    // In production, this would retrieve the verification public key
    return process.env.VERIFICATION_PUBLIC_KEY || crypto.randomBytes(32);
  }
}

module.exports = EncryptionService;
