/**
 * Combined document validation utility for CPF and CNPJ
 * Automatically detects and validates the document type
 */

import { CPFValidator } from "./cpf-validation";
import { CNPJValidator } from "./cnpj-validation";

export type DocumentType = "CPF" | "CNPJ";

export class DocumentValidator {
  /**
   * Detects if a document is CPF or CNPJ based on length
   * @param document - Document string
   * @returns "CPF" | "CNPJ" | null
   */
  static detectType(document: string): DocumentType | null {
    const clean = document.replace(/\D/g, "");
    if (clean.length === 11) return "CPF";
    if (clean.length === 14) return "CNPJ";
    return null;
  }

  /**
   * Validates if a document (CPF or CNPJ) is valid
   * @param document - Document string
   * @returns true if valid, false otherwise
   */
  static isValid(document: string): boolean {
    const clean = document.replace(/\D/g, "");
    const type = this.detectType(clean);

    if (type === "CPF") {
      return CPFValidator.isValid(document);
    } else if (type === "CNPJ") {
      return CNPJValidator.isValid(document);
    }

    return false;
  }

  /**
   * Formats document based on its type
   * @param document - Document string
   * @returns formatted document
   */
  static format(document: string): string {
    const clean = document.replace(/\D/g, "");
    const type = this.detectType(clean);

    if (type === "CPF") {
      return CPFValidator.format(document);
    } else if (type === "CNPJ") {
      return CNPJValidator.format(document);
    }

    return document;
  }

  /**
   * Removes formatting from document
   * @param document - Document string
   * @returns clean document (only numbers)
   */
  static clean(document: string): string {
    return document.replace(/\D/g, "");
  }

  /**
   * Validates document and returns detailed result
   * @param document - Document string
   * @returns validation result object
   */
  static validate(document: string): {
    isValid: boolean;
    type: DocumentType | null;
    cleanDocument: string;
    formattedDocument: string;
    errors: string[];
  } {
    const errors: string[] = [];
    const cleanDocument = this.clean(document);
    const type = this.detectType(cleanDocument);

    if (!type) {
      errors.push("Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)");
      return {
        isValid: false,
        type: null,
        cleanDocument,
        formattedDocument: document,
        errors,
      };
    }

    if (type === "CPF") {
      const cpfResult = CPFValidator.validate(document);
      return {
        isValid: cpfResult.isValid,
        type: "CPF",
        cleanDocument: cpfResult.cleanCPF,
        formattedDocument: cpfResult.formattedCPF,
        errors: cpfResult.errors,
      };
    } else {
      const cnpjResult = CNPJValidator.validate(document);
      return {
        isValid: cnpjResult.isValid,
        type: "CNPJ",
        cleanDocument: cnpjResult.cleanCNPJ,
        formattedDocument: cnpjResult.formattedCNPJ,
        errors: cnpjResult.errors,
      };
    }
  }
}

/**
 * Document input mask utility for real-time formatting (CPF or CNPJ)
 */
export class DocumentMask {
  /**
   * Applies appropriate mask to input value based on length
   * @param value - Input value
   * @returns masked value
   */
  static apply(value: string): string {
    const cleanValue = value.replace(/\D/g, "");

    // Limit to 14 digits (max for CNPJ)
    const limitedValue = cleanValue.slice(0, 14);

    // If 11 digits or less, apply CPF mask
    if (limitedValue.length <= 11) {
      if (limitedValue.length <= 3) {
        return limitedValue;
      } else if (limitedValue.length <= 6) {
        return `${limitedValue.slice(0, 3)}.${limitedValue.slice(3)}`;
      } else if (limitedValue.length <= 9) {
        return `${limitedValue.slice(0, 3)}.${limitedValue.slice(3, 6)}.${limitedValue.slice(6)}`;
      } else {
        return `${limitedValue.slice(0, 3)}.${limitedValue.slice(3, 6)}.${limitedValue.slice(6, 9)}-${limitedValue.slice(9, 11)}`;
      }
    } else {
      // Apply CNPJ mask for 12+ digits
      // When transitioning from CPF to CNPJ, reformat from the beginning
      if (limitedValue.length <= 2) {
        return limitedValue;
      } else if (limitedValue.length <= 5) {
        return `${limitedValue.slice(0, 2)}.${limitedValue.slice(2)}`;
      } else if (limitedValue.length <= 8) {
        return `${limitedValue.slice(0, 2)}.${limitedValue.slice(2, 5)}.${limitedValue.slice(5)}`;
      } else if (limitedValue.length <= 12) {
        return `${limitedValue.slice(0, 2)}.${limitedValue.slice(2, 5)}.${limitedValue.slice(5, 8)}/${limitedValue.slice(8)}`;
      } else {
        return `${limitedValue.slice(0, 2)}.${limitedValue.slice(2, 5)}.${limitedValue.slice(5, 8)}/${limitedValue.slice(8, 12)}-${limitedValue.slice(12, 14)}`;
      }
    }
  }

  /**
   * Removes mask from document value
   * @param value - Masked value
   * @returns clean value
   */
  static remove(value: string): string {
    return value.replace(/\D/g, "");
  }
}

