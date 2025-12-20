"use client";
import React, { useState, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  autoFocus?: boolean;
  "aria-describedby"?: string;
}

export const EmailField = forwardRef<HTMLInputElement, EmailFieldProps>(
  (
    {
      value,
      onChange,
      onBlur,
      label = "Email",
      placeholder = "Digite seu email",
      error,
      disabled = false,
      required = false,
      className,
      autoFocus = false,
      "aria-describedby": ariaDescribedBy,
    },
    ref
  ) => {
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{
      isValid: boolean;
      type: "email";
    } | null>(null);

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    // Validate on blur
    const handleBlur = () => {
      if (value.trim()) {
        setIsValidating(true);

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(value);

        console.log("Email validation result:", isValid);

        setValidationResult({
          isValid,
          type: "email",
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

    // Determine icon and validation state
    const getIcon = () => {
      if (isValidating) {
        return null;
      }

      if (validationResult?.isValid) {
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      }

      if (validationResult?.isValid === false) {
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      }

      return <Mail className="h-5 w-5 text-gray-300" />;
    };

    // Determine validation message
    const getValidationMessage = () => {
      if (isValidating) {
        return null;
      }

      if (validationResult?.isValid) {
        return <span className="text-green-500 text-sm">Email válido</span>;
      }

      if (validationResult?.isValid === false) {
        return <span className="text-red-500 text-sm">Email inválido</span>;
      }

      return (
        <span className="text-gray-400 text-sm">
          Digite seu endereço de email
        </span>
      );
    };

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label htmlFor="email" className="text-sm font-medium text-gray-200">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}

        <div className="relative">
          <Input
            ref={ref}
            id="email"
            type="email"
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-describedby={ariaDescribedBy}
            aria-invalid={validationResult?.isValid === false || !!error}
            aria-required={required}
            className={cn(
              "w-full pl-10 pr-10 h-12 bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:border-[#12E0A1] focus:ring-1 focus:ring-[#12E0A1] transition-all duration-200",
              validationResult?.isValid === true &&
                "border-green-500 focus:border-green-500 focus:ring-green-500",
              validationResult?.isValid === false &&
                "border-red-500 focus:border-red-500 focus:ring-red-500",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
          />

          {/* Left icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {getIcon()}
          </div>
        </div>

        {/* Validation message */}
        {getValidationMessage()}

        {/* Error message */}
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </div>
    );
  }
);

EmailField.displayName = "EmailField";
