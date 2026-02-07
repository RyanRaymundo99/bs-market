"use client";

import React, { useState, useCallback } from "react";
import { TwoFactorManagement } from "@/components/Auth/TwoFactorManagement";
import NavbarNew from "@/components/ui/navbar-new";
import { GlobalKYCBanner } from "@/components/GlobalKYCBanner";
import { Shield } from "lucide-react";

export default function SecurityPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      // Call logout API to clear session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
      // Clear local storage
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      
      // Force redirect to home page using window.location for reliability
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, clear local storage and redirect
      localStorage.removeItem("auth-session");
      localStorage.removeItem("user");
      sessionStorage.clear();
      // Force redirect using window.location
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <NavbarNew isLoggingOut={isLoggingOut} handleLogout={handleLogout} />
      <GlobalKYCBanner />
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
