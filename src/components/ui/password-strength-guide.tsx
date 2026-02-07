"use client";

import React from "react";
import { Check, X } from "lucide-react";

const MIN_LENGTH = 6;
const MAX_LENGTH = 20;
const SPECIAL_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: "length",
      label: `Entre ${MIN_LENGTH} e ${MAX_LENGTH} caracteres`,
      met: password.length >= MIN_LENGTH && password.length <= MAX_LENGTH,
    },
    {
      id: "lowercase",
      label: "Uma letra minúscula",
      met: /[a-z]/.test(password),
    },
    {
      id: "uppercase",
      label: "Uma letra maiúscula",
      met: /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "Pelo menos um número",
      met: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "Um caractere especial (!@#$%^&* etc.)",
      met: SPECIAL_REGEX.test(password),
    },
  ];
}

interface PasswordStrengthGuideProps {
  password: string;
  className?: string;
}

export function PasswordStrengthGuide({
  password,
  className = "",
}: PasswordStrengthGuideProps) {
  const requirements = getPasswordRequirements(password ?? "");
  const allMet = requirements.every((r) => r.met);

  if (!password) {
    return (
      <div
        className={`rounded-md border border-border bg-muted/50 p-3 ${className}`}
        role="status"
        aria-label="Requisitos da senha"
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Sua senha deve conter:
        </p>
        <ul className="space-y-1.5 text-xs text-destructive">
          {requirements.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <X className="h-4 w-4 shrink-0 text-destructive" />
              {r.label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border border-border bg-muted/50 p-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={
        allMet
          ? "Todos os requisitos da senha foram atendidos"
          : "Requisitos da senha"
      }
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Sua senha deve conter:
      </p>
      <ul className="space-y-1.5 text-xs">
        {requirements.map((r) => (
          <li
            key={r.id}
            className={`flex items-center gap-2 ${
              r.met ? "text-primary" : "text-destructive"
            }`}
          >
            {r.met ? (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <X className="h-4 w-4 shrink-0 text-destructive" />
            )}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
