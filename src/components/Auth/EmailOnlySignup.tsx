"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, Mail, CheckCircle } from "lucide-react";

interface EmailOnlySignupProps {
  onSuccess?: () => void;
}

interface SignUpFormValues {
  name: string;
  email: string;
  cpf: string;
  password: string;
  confirmPassword: string;
}

const EmailOnlySignup = ({ onSuccess }: EmailOnlySignupProps) => {
  const [formData, setFormData] = useState<SignUpFormValues>({
    name: "",
    email: "",
    cpf: "",
    password: "",
    confirmPassword: "",
  });
  const [pending, setPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [currentStep, setCurrentStep] = useState<"form" | "verify" | "success">(
    "form"
  );
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!formData.cpf.trim()) return "CPF is required";
    if (!formData.password) return "Password is required";
    if (formData.password !== formData.confirmPassword)
      return "Passwords do not match";
    if (formData.password.length < 6)
      return "Password must be at least 6 characters";
    return null;
  };

  const createAccount = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validationError,
      });
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/signup-email-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentStep("verify");
        toast({
          title: "Account created",
          description: "Please check your email for the verification code",
        });
      } else {
        throw new Error(result.error || "Failed to create account");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setPending(false);
    }
  };

  const verifyEmail = async () => {
    if (!verificationCode.trim()) {
      toast({
        variant: "destructive",
        title: "Verification code required",
        description: "Please enter the code sent to your email",
      });
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode,
          purpose: "signup",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentStep("success");
        toast({
          title: "Email verified",
          description: "Your account has been successfully created!",
        });
        onSuccess?.();
      } else {
        throw new Error(result.error || "Verification failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setVerifying(false);
    }
  };

  const resendCode = async () => {
    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.email,
          type: "email",
          purpose: "signup",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Code resent",
          description: "Check your email for the new verification code",
        });
      } else {
        throw new Error(result.error || "Failed to resend code");
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to resend",
        description: "Please try again",
      });
    }
  };

  if (currentStep === "success") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Account Created!</CardTitle>
          <CardDescription>
            Your email has been verified and your account is ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              router.replace("/dashboard");
              router.refresh();
            }}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === "verify") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification code to{" "}
            <strong>{formData.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="verificationCode">Verification Code</Label>
            <Input
              id="verificationCode"
              type="text"
              placeholder="Enter 4-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={4}
              className="text-center text-lg tracking-widest"
            />
          </div>

          <Button onClick={verifyEmail} disabled={verifying} className="w-full">
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>

          <div className="text-center">
            <Button variant="link" onClick={resendCode} className="text-sm">
              Didn&apos;t receive the code? Resend
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Sign up with your email address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            name="cpf"
            type="text"
            value={formData.cpf}
            onChange={handleInputChange}
            placeholder="000.000.000-00"
            required
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Create a password"
            required
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm your password"
            required
          />
        </div>

        <Button onClick={createAccount} disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailOnlySignup;
