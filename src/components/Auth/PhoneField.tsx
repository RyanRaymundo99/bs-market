"use client";

import React from "react";
import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  label?: string;
  placeholder?: string;
}

export function PhoneField({
  value,
  onChange,
  onBlur,
  error,
  required = false,
  label = "Phone Number",
  placeholder = "(11) 99999-9999",
}: PhoneFieldProps) {
  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters
    const cleaned = input.replace(/\D/g, "");

    // Limit to 11 digits (Brazilian mobile)
    const limited = cleaned.slice(0, 11);

    // Format based on length
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      const hasNinthDigit = limited.length === 11;
      if (hasNinthDigit) {
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(
          7
        )}`;
      } else {
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(
          6
        )}`;
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone" className="text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Phone className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring ${
            error ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
        />
      </div>
      {error && <p className="text-destructive text-sm mt-1">{error}</p>}
      <p className="text-muted-foreground text-xs">
        Enter your phone number with area code (e.g., (11) 99999-9999)
      </p>
    </div>
  );
}

export default PhoneField;













