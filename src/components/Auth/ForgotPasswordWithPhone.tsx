"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { AuthLayout } from "@/components/ui/auth-layout";

const ForgotPasswordWithPhone = () => {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
  };

  const requestReset = async () => {
    if (!identifier) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email address",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier,
          type: "email",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStep("verify");
        toast({
          title: "Code sent",
          description: "Verification code sent to your email",
        });

        // Show dev code in development
        if (result.code) {
          toast({
            title: "Development Mode",
            description: `Reset code: ${result.code}`,
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to send reset code",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reset code",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length !== 4) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter the 4-digit verification code",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier,
          code: code,
          type: "email",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStep("reset");
        toast({
          title: "Code verified",
          description: "Now set your new password",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Invalid verification code",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify code",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 8 characters",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords don&apos;t match",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier,
          code: code,
          newPassword: newPassword,
          type: "email",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Password reset successfully",
        });

        setTimeout(() => {
          router.replace("/login");
          router.refresh();
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to reset password",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset password",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderRequestStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-white">
          Reset Your Password
        </CardTitle>
        <p className="text-center text-white/70">
          Enter your email address to receive a reset code
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="email" className="text-white">
            Email Address
          </Label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-300" />
            </div>
            <Input
              id="email"
              type="email"
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              placeholder="your.email@example.com"
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
            />
          </div>
        </div>

        <Button
          onClick={requestReset}
          disabled={loading || !identifier}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending Code...
            </>
          ) : (
            <>
              Send Reset Code
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-blue-300 hover:text-blue-200 underline text-sm"
          >
            Back to Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const renderVerifyStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-white">
          Enter Verification Code
        </CardTitle>
        <p className="text-center text-white/70">
          We sent a 4-digit code to your email
        </p>
        <p className="text-center text-white/50 text-sm">{identifier}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="code" className="text-white">
            Verification Code
          </Label>
          <Input
            id="code"
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="Enter 4-digit code"
            className="text-center text-lg font-mono bg-white/10 border-white/20 text-white"
            maxLength={4}
          />
        </div>

        <Button
          onClick={verifyCode}
          disabled={loading || code.length !== 4}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </Button>

        <div className="flex justify-between text-sm">
          <button
            onClick={() => setStep("request")}
            className="text-blue-300 hover:text-blue-200 underline"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Back
          </button>
          <button
            onClick={requestReset}
            disabled={loading}
            className="text-blue-300 hover:text-blue-200 underline"
          >
            Resend Code
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderResetStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-white">
          Set New Password
        </CardTitle>
        <p className="text-center text-white/70">
          Enter your new password below
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="newPassword" className="text-white">
            New Password
          </Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="bg-white/10 border-white/20 text-white"
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-white">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="bg-white/10 border-white/20 text-white"
          />
        </div>

        <Button
          onClick={resetPassword}
          disabled={loading || !newPassword || !confirmPassword}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>

        <div className="text-center">
          <button
            onClick={() => setStep("verify")}
            className="text-blue-300 hover:text-blue-200 underline text-sm"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Back to Verification
          </button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AuthLayout title="" description="" showLogo={true}>
      <div className="flex items-center justify-center min-h-[60vh]">
        {step === "request" && renderRequestStep()}
        {step === "verify" && renderVerifyStep()}
        {step === "reset" && renderResetStep()}
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordWithPhone;
