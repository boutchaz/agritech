import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');

    if (!key) {
      this.logger.warn(
        'ENCRYPTION_KEY not set. Generating a temporary key. ' +
        'Please set ENCRYPTION_KEY in your environment for production use.'
      );
      // Generate a deterministic key based on a secret (not recommended for production)
      const fallbackSecret = this.configService.get<string>('JWT_SECRET', 'default-secret');
      this.encryptionKey = crypto.scryptSync(fallbackSecret, 'salt', this.keyLength);
    } else {
      // If key is provided, derive a proper key from it
      this.encryptionKey = crypto.scryptSync(key, 'agritech-salt', this.keyLength);
    }
  }

  /**
   * Encrypts a plaintext string using AES-256-GCM
   * Returns a base64 encoded string containing: iv + authTag + ciphertext
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return '';
    }

    try {
      // Generate a random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get the auth tag
      const authTag = cipher.getAuthTag();

      // Combine iv + authTag + encrypted data
      const combined = Buffer.concat([iv, authTag, encrypted]);

      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts a base64 encoded encrypted string
   * Expects format: iv + authTag + ciphertext
   */
  decrypt(encryptedBase64: string): string {
    if (!encryptedBase64) {
      return '';
    }

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedBase64, 'base64');

      // Extract iv, authTag, and encrypted data
      const iv = combined.subarray(0, this.ivLength);
      const authTag = combined.subarray(this.ivLength, this.ivLength + this.authTagLength);
      const encrypted = combined.subarray(this.ivLength + this.authTagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Masks an API key for display purposes
   * Shows first 4 and last 4 characters: sk-xxxx...xxxx
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 12) {
      return '****';
    }
    const start = apiKey.substring(0, 7);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  }

  /**
   * Validates that a string looks like a valid API key format
   */
  validateApiKeyFormat(apiKey: string, provider: 'openai' | 'gemini'): boolean {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    switch (provider) {
      case 'openai':
        // OpenAI keys start with 'sk-' and are typically 51 characters
        return apiKey.startsWith('sk-') && apiKey.length >= 40;
      case 'gemini':
        // Google AI keys are typically 39 characters
        return apiKey.length >= 30;
      default:
        return apiKey.length >= 20;
    }
  }
}
