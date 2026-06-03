const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorAuth {
  /**
   * Generate a new secret for a user
   */
  static generateSecret(username) {
    const secret = speakeasy.generateSecret({
      name: `Ismawood (${username})`,
      issuer: 'Ismawood ERP',
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
    };
  }

  /**
   * Generate QR code for the secret
   */
  static async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(secret, token) {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps for clock drift
    });

    return verified;
  }

  /**
   * Generate a backup code (for when user loses 2FA device)
   */
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = speakeasy.generateSecretLength(16).toUpperCase();
      // Format as XXXX-XXXX-XXXX-XXXX
      const formattedCode = code.match(/.{1,4}/g).join('-');
      codes.push(formattedCode);
    }
    return codes;
  }

  /**
   * Hash a backup code for storage
   */
  static async hashBackupCode(code) {
    const bcrypt = require('bcrypt');
    const hashedCode = await bcrypt.hash(code, 10);
    return hashedCode;
  }

  /**
   * Verify a backup code
   */
  static async verifyBackupCode(code, hashedCodes) {
    const bcrypt = require('bcrypt');
    for (const hashedCode of hashedCodes) {
      const isValid = await bcrypt.compare(code, hashedCode);
      if (isValid) return true;
    }
    return false;
  }
}

module.exports = TwoFactorAuth;
