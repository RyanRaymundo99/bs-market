"use client";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { DocumentValidator, DocumentMask, DocumentType } from "@/lib/utils/document-validation";
import { cn } from "@/lib/utils";

interface DocumentFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const DocumentField: React.FC<DocumentFieldProps> = ({
  value,
  onChange,
  onBlur,
  label = "CPF ou CNPJ",
  placeholder = "000.000.000-00 ou 00.000.000/0000-00",
  error,
  disabled = false,
  required = false,
  className,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    type: DocumentType | null;
    errors: string[];
  } | null>(null);

  // Detect document type based on current input length
  const cleanValue = value.replace(/\D/g, "");
  const detectedType: DocumentType | null = cleanValue.length <= 11 ? "CPF" : cleanValue.length <= 14 ? "CNPJ" : null;
  
  // Dynamic label based on detected type
  const dynamicLabel = cleanValue.length === 0 
    ? label 
    : cleanValue.length <= 11 
    ? "CPF" 
    : "CNPJ";
  
  // Dynamic placeholder based on detected type
  const dynamicPlaceholder = cleanValue.length === 0
    ? placeholder
    : cleanValue.length <= 11
    ? "000.000.000-00"
    : "00.000.000/0000-00";

  // Apply mask to input value (automatically detects CPF or CNPJ)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const maskedValue = DocumentMask.apply(rawValue);
    onChange(maskedValue);
  };

  // Validate document on blur
  const handleBlur = () => {
    if (value.trim()) {
      setIsValidating(true);
      const result = DocumentValidator.validate(value);
      setValidationResult({
        isValid: result.isValid,
        type: result.type,
        errors: result.errors,
      });
      setIsValidating(false);
    } else {
      setValidationResult(null);
    }
    onBlur?.();
  };

  // Clear validation on focus
  const handleFocus = () => {
    setValidationResult(null);
  };

  // Auto-format on mount if value exists
  useEffect(() => {
    if (value && !value.includes(".") && !value.includes("/")) {
      const formatted = DocumentMask.apply(value);
      if (formatted !== value) {
        onChange(formatted);
      }
    }
  }, [value, onChange]);

  const hasError = error || (validationResult && !validationResult.isValid);
  const isValid = validationResult?.isValid;
  const documentType = validationResult?.type || detectedType;

  // Max length: 18 characters for CNPJ format (00.000.000/0000-00)
  const maxLength = 18;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {dynamicLabel}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={dynamicPlaceholder}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            "pr-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
            hasError && "border-destructive focus-visible:ring-destructive",
            isValid && "border-primary focus-visible:ring-primary"
          )}
        />

        {/* Validation Icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isValidating && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          )}
          {!isValidating && isValid && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
          {!isValidating && hasError && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>

      {/* Error Messages */}
      {hasError && (
        <div className="text-sm text-destructive space-y-1">
          {error && <p>{error}</p>}
          {validationResult?.errors.map((err, index) => (
            <p key={index}>{err}</p>
          ))}
        </div>
      )}

      {/* Success Message */}
      {isValid && documentType && (
        <div className="text-sm text-primary">
          <p>{documentType} válido</p>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        {cleanValue.length === 0 
          ? "Digite apenas os números do CPF (11 dígitos) ou CNPJ (14 dígitos)"
          : cleanValue.length <= 11
          ? "CPF: 11 dígitos (ex: 000.000.000-00)"
          : "CNPJ: 14 dígitos (ex: 00.000.000/0000-00)"}
      </p>
    </div>
  );
};

