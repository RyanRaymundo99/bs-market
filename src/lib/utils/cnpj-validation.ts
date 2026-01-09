/**
 * CNPJ (Brazilian Company Tax ID) validation utility
 * Implements the official Brazilian CNPJ validation algorithm
 */

export class CNPJValidator {
  /**
   * Validates if a CNPJ is valid using the official Brazilian algorithm
   * @param cnpj - CNPJ string (can contain dots, slashes and dashes)
   * @returns true if valid, false otherwise
   */
  static isValid(cnpj: string): boolean {
    // Remove all non-numeric characters
    const cleanCNPJ = cnpj.replace(/\D/g, "");

    // Check if it has 14 digits
    if (cleanCNPJ.length !== 14) {
      return false;
    }

    // Check if all digits are the same (invalid CNPJ)
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      return false;
    }

    // Validate first check digit
    let length = cleanCNPJ.length - 2;
    let numbers = cleanCNPJ.substring(0, length);
    const digits = cleanCNPJ.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) {
      return false;
    }

    // Validate second check digit
    length = length + 1;
    numbers = cleanCNPJ.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) {
      return false;
    }

    return true;
  }

  /**
   * Formats CNPJ with dots, slash and dash (XX.XXX.XXX/XXXX-XX)
   * @param cnpj - CNPJ string
   * @returns formatted CNPJ
   */
  static format(cnpj: string): string {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    return cleanCNPJ.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  /**
   * Removes formatting from CNPJ (dots, slash and dash)
   * @param cnpj - CNPJ string
   * @returns clean CNPJ (only numbers)
   */
  static clean(cnpj: string): string {
    return cnpj.replace(/\D/g, "");
  }

  /**
   * Validates CNPJ and returns detailed result
   * @param cnpj - CNPJ string
   * @returns validation result object
   */
  static validate(cnpj: string): {
    isValid: boolean;
    cleanCNPJ: string;
    formattedCNPJ: string;
    errors: string[];
  } {
    const errors: string[] = [];
    const cleanCNPJ = this.clean(cnpj);

    // Check length
    if (cleanCNPJ.length !== 14) {
      errors.push("CNPJ deve ter 14 dígitos");
    }

    // Check if all digits are the same
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      errors.push("CNPJ não pode ter todos os dígitos iguais");
    }

    // Check if it's a valid CNPJ
    if (!this.isValid(cleanCNPJ)) {
      errors.push("CNPJ inválido");
    }

    return {
      isValid: errors.length === 0,
      cleanCNPJ,
      formattedCNPJ: this.format(cleanCNPJ),
      errors,
    };
  }
}

/**
 * CNPJ input mask utility for real-time formatting
 */
export class CNPJMask {
  /**
   * Applies CNPJ mask to input value
   * @param value - Input value
   * @returns masked value
   */
  static apply(value: string): string {
    const cleanValue = value.replace(/\D/g, "");

    if (cleanValue.length <= 2) {
      return cleanValue;
    } else if (cleanValue.length <= 5) {
      return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2)}`;
    } else if (cleanValue.length <= 8) {
      return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2, 5)}.${cleanValue.slice(5)}`;
    } else if (cleanValue.length <= 12) {
      return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2, 5)}.${cleanValue.slice(5, 8)}/${cleanValue.slice(8)}`;
    } else {
      return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2, 5)}.${cleanValue.slice(5, 8)}/${cleanValue.slice(8, 12)}-${cleanValue.slice(12, 14)}`;
    }
  }

  /**
   * Removes mask from CNPJ value
   * @param value - Masked value
   * @returns clean value
   */
  static remove(value: string): string {
    return value.replace(/\D/g, "");
  }
}

