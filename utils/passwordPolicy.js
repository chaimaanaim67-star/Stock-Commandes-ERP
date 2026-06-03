/**
 * Password Policy Utility
 * Enforces strong password requirements for enterprise security
 */

class PasswordPolicy {
  static requirements = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  };

  static validate(password) {
    const errors = [];

    if (!password) {
      errors.push('Le mot de passe est requis');
      return { valid: false, errors };
    }

    // Length check
    if (password.length < this.requirements.minLength) {
      errors.push(`Le mot de passe doit contenir au moins ${this.requirements.minLength} caractères`);
    }

    if (password.length > this.requirements.maxLength) {
      errors.push(`Le mot de passe ne peut pas dépasser ${this.requirements.maxLength} caractères`);
    }

    // Uppercase check
    if (this.requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }

    // Lowercase check
    if (this.requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }

    // Numbers check
    if (this.requirements.requireNumbers && !/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    // Special characters check
    if (this.requirements.requireSpecialChars) {
      const hasSpecialChar = new RegExp(`[${this.requirements.specialChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password);
      if (!hasSpecialChar) {
        errors.push('Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*()_+-=[]{}|;:,.<>?)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static getPasswordStrength(password) {
    if (!password) return { score: 0, label: 'Aucun', color: 'gray' };

    let score = 0;

    // Length contributes up to 25 points
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 5;

    // Character variety contributes up to 75 points
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 30;

    // Determine label and color
    if (score < 30) return { score, label: 'Faible', color: 'red' };
    if (score < 50) return { score, label: 'Moyen', color: 'orange' };
    if (score < 70) return { score, label: 'Fort', color: 'yellow' };
    return { score, label: 'Très fort', color: 'green' };
  }

  static generatePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = lowercase + uppercase + numbers + special;
    let password = '';

    // Ensure at least one of each required character type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

module.exports = PasswordPolicy;
