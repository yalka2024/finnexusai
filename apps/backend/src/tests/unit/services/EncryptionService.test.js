/**
 * Encryption Service Unit Tests
 */

const EncryptionService = require('../../../services/security/EncryptionService');

describe('EncryptionService', () => {
  let encryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('encryptData', () => {
    it('should encrypt data successfully', async() => {
      const testData = { message: 'Hello, World!', userId: '123' };
      const options = { userId: 'test-user', dataType: 'message' };

      const result = await encryptionService.encryptData(testData, options);

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('dataType');
    });

    it('should handle different data types', async() => {
      const stringData = 'Simple string data';
      const bufferData = Buffer.from('Buffer data');
      const objectData = { complex: 'object', with: ['array', 'data'] };

      const stringResult = await encryptionService.encryptData(stringData);
      const bufferResult = await encryptionService.encryptData(bufferData);
      const objectResult = await encryptionService.encryptData(objectData);

      expect(stringResult.encryptedData).toBeDefined();
      expect(bufferResult.encryptedData).toBeDefined();
      expect(objectResult.encryptedData).toBeDefined();
    });

    it('should throw error for invalid input', async() => {
      await expect(encryptionService.encryptData(null)).rejects.toThrow();
      await expect(encryptionService.encryptData(undefined)).rejects.toThrow();
    });
  });

  describe('decryptData', () => {
    it('should decrypt data successfully', async() => {
      const originalData = { message: 'Hello, World!', userId: '123' };

      // First encrypt the data
      const encrypted = await encryptionService.encryptData(originalData);

      // Then decrypt it
      const decrypted = await encryptionService.decryptData(encrypted);

      expect(decrypted).toEqual(originalData);
    });

    it('should handle corrupted encrypted data', async() => {
      const corruptedPayload = {
        encryptedData: 'corrupted-data',
        iv: 'invalid-iv',
        authTag: 'invalid-tag',
        algorithm: 'aes-256-gcm',
        keyId: 'test-key',
        timestamp: new Date().toISOString(),
        dataType: 'test'
      };

      await expect(encryptionService.decryptData(corruptedPayload)).rejects.toThrow();
    });

    it('should verify data integrity', async() => {
      const originalData = { message: 'Test message' };
      const encrypted = await encryptionService.encryptData(originalData);

      const decrypted = await encryptionService.decryptData(encrypted, { verifyIntegrity: true });

      expect(decrypted).toEqual(originalData);
    });
  });

  describe('hashData', () => {
    it('should hash data successfully', async() => {
      const testData = 'password123';
      const result = await encryptionService.hashData(testData);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('iterations');
      expect(result.hash).toBeDefined();
    });

    it('should hash data with salt', async() => {
      const testData = 'password123';
      const salt = Buffer.from('test-salt');

      const result = await encryptionService.hashData(testData, { salt });

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(result.salt).toBeDefined();
    });

    it('should produce consistent hashes', async() => {
      const testData = 'consistent-data';

      const hash1 = await encryptionService.hashData(testData);
      const hash2 = await encryptionService.hashData(testData);

      expect(hash1.hash).toBe(hash2.hash);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate symmetric key', async() => {
      const result = await encryptionService.generateEncryptionKey({
        keyType: 'symmetric',
        userId: 'test-user',
        dataType: 'test'
      });

      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('keyData');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.keyType).toBe('symmetric');
    });

    it('should generate asymmetric key pair', async() => {
      const result = await encryptionService.generateEncryptionKey({
        keyType: 'asymmetric',
        userId: 'test-user',
        dataType: 'test'
      });

      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('keyData');
      expect(result.keyData).toHaveProperty('publicKey');
      expect(result.keyData).toHaveProperty('privateKey');
      expect(result.metadata.keyType).toBe('asymmetric');
    });

    it('should generate unique key IDs', async() => {
      const key1 = await encryptionService.generateEncryptionKey();
      const key2 = await encryptionService.generateEncryptionKey();

      expect(key1.keyId).not.toBe(key2.keyId);
    });
  });

  describe('rotateKeys', () => {
    it('should rotate keys successfully', async() => {
      // First create a key to rotate
      const key = await encryptionService.generateEncryptionKey({
        userId: 'test-user',
        dataType: 'test'
      });

      const result = await encryptionService.rotateKeys({
        userId: 'test-user',
        dataType: 'test',
        forceRotation: true
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle rotation with no keys to rotate', async() => {
      const result = await encryptionService.rotateKeys({
        userId: 'nonexistent-user',
        forceRotation: false
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('signData and verifySignature', () => {
    it('should sign and verify data successfully', async() => {
      const testData = { message: 'Test signature', timestamp: Date.now() };

      const signature = await encryptionService.signData(testData);
      const isValid = await encryptionService.verifySignature(testData, signature);

      expect(signature).toBeDefined();
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', async() => {
      const testData = { message: 'Test signature' };
      const invalidSignature = 'invalid-signature';

      const isValid = await encryptionService.verifySignature(testData, invalidSignature);
      expect(isValid).toBe(false);
    });

    it('should reject signatures for different data', async() => {
      const originalData = { message: 'Original data' };
      const modifiedData = { message: 'Modified data' };

      const signature = await encryptionService.signData(originalData);
      const isValid = await encryptionService.verifySignature(modifiedData, signature);

      expect(isValid).toBe(false);
    });
  });

  describe('encryptForTransmission and decryptFromTransmission', () => {
    it('should encrypt and decrypt for transmission', async() => {
      const testData = { sensitive: 'data', amount: 1000 };
      const publicKey = 'mock-public-key';
      const privateKey = 'mock-private-key';

      // Mock the crypto functions for transmission
      jest.spyOn(require('crypto'), 'publicEncrypt').mockReturnValue(Buffer.from('encrypted-session-key'));
      jest.spyOn(require('crypto'), 'privateDecrypt').mockReturnValue(Buffer.from('session-key'));

      const transmissionPayload = await encryptionService.encryptForTransmission(
        testData,
        publicKey
      );

      expect(transmissionPayload).toHaveProperty('encryptedData');
      expect(transmissionPayload).toHaveProperty('encryptedSessionKey');
      expect(transmissionPayload).toHaveProperty('iv');
      expect(transmissionPayload).toHaveProperty('authTag');

      const decryptedData = await encryptionService.decryptFromTransmission(
        transmissionPayload,
        privateKey
      );

      expect(decryptedData).toEqual(testData);
    });
  });

  describe('error handling', () => {
    it('should handle encryption errors gracefully', async() => {
      // Mock crypto to throw error
      jest.spyOn(require('crypto'), 'createCipher').mockImplementation(() => {
        throw new Error('Crypto error');
      });

      await expect(encryptionService.encryptData('test')).rejects.toThrow('Failed to encrypt data');
    });

    it('should handle decryption errors gracefully', async() => {
      const invalidPayload = {
        encryptedData: 'invalid',
        iv: 'invalid',
        authTag: 'invalid',
        algorithm: 'aes-256-gcm',
        keyId: 'invalid-key',
        timestamp: new Date().toISOString(),
        dataType: 'test'
      };

      await expect(encryptionService.decryptData(invalidPayload)).rejects.toThrow('Failed to decrypt data');
    });
  });
});
