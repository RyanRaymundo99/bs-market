"use client";

import React from "react";
import { TwoFactorManagement } from "@/components/Auth/TwoFactorManagement";
import { DESKTOP_SHELL_PL } from "@/constants/layout-shell";
import { Shield } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className={`min-h-screen bg-background ${DESKTOP_SHELL_PL}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-foreground">
              Security Settings
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account security settings and two-factor authentication.
          </p>
        </div>

        <TwoFactorManagement />
      </div>
    </div>
  );
}
