"use client";

import React, { useState, useCallback } from "react";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Shield,
  CheckCircle,
} from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { InputField } from "@/components/Auth/FormFields";
import { DocumentField } from "@/components/Auth/DocumentField";
import { PhoneField } from "@/components/Auth/PhoneField";
import { SignUpFormValues, signUpSchema } from "@/lib/schema/signupSchema";
import { AuthLayout } from "@/components/ui/auth-layout";
import { TwoFactorSignupSetup } from "@/components/Auth/TwoFactorSignupSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface VerificationState {
  email: {
    sent: boolean;
    verified: boolean;
    loading: boolean;
  };
}

const SignupWithVerification = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setUserCreated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [verification, setVerification] = useState<VerificationState>({
    email: { sent: false, verified: false, loading: false },
  });

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema) as Resolver<SignUpFormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      password: "",
      confirmPassword: "",
      acceptMarketing: false,
      acceptTerms: false,
    },
  });

  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const steps: SignupStep[] = [
    {
      id: 1,
      title: "Account Information",
      description: "Enter your personal details",
      completed: currentStep > 1,
    },
    {
      id: 2,
      title: "Verify Email",
      description: "Confirm your email address",
      completed: currentStep > 2,
    },
    {
      id: 3,
      title: "Setup 2FA",
      description: "Secure your account with two-factor authentication",
      completed: currentStep > 3,
    },
    {
      id: 4,
      title: "Complete",
      description: "Account setup finished",
      completed: currentStep > 4,
    },
  ];

  const sendEmailVerification = useCallback(
    async (email: string) => {
      setVerification((prev) => ({
        ...prev,
        email: { ...prev.email, loading: true },
      }));

      try {
        const response = await fetch("/api/auth/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: email,
            type: "email",
            purpose: "signup",
          }),
        });

        const result = await response.json();

        if (result.success) {
          setVerification((prev) => ({
            ...prev,
            email: { sent: true, verified: false, loading: false },
          }));

          toast({
            title: "Email sent",
            description: "Check your email for the verification code",
          });

          // Show dev code in development
          if (result.code) {
            toast({
              title: "Development Mode",
              description: `Email verification code: ${result.code}`,
            });
          }
        } else {
          throw new Error(result.error);
        }
      } catch {
        setVerification((prev) => ({
          ...prev,
          email: { ...prev.email, loading: false },
        }));

        toast({
          variant: "destructive",
          title: "Failed to send email",
          description: "Please try again",
        });
      }
    },
    [toast]
  );

  const createAccount = useCallback(
    async (data: SignUpFormValues) => {
      try {
        setPending(true);

        const response = await fetch("/api/auth/signup-with-verification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone,
            cpf: data.cpf,
            password: data.password,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          setUserCreated(true);
          setUserEmail(data.email);
          setUserName(data.name);
          setCurrentStep(2);

          // Auto-send verification code
          sendEmailVerification(data.email);

          toast({
            title: "Account created!",
            description: "Please verify your email address to continue",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error creating account",
            description:
              result.error || "An error occurred while creating your account.",
          });
        }
      } catch (error) {
        console.error("Signup error:", error);
        toast({
          variant: "destructive",
          title: "Error creating account",
          description: "An unexpected error occurred",
        });
      } finally {
        setPending(false);
      }
    },
    [toast, sendEmailVerification]
  );

  const verifyEmail = async () => {
    if (!emailCode || emailCode.length !== 4) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter a 4-digit code",
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: userEmail,
          code: emailCode,
          type: "EMAIL",
          purpose: "signup",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setVerification((prev) => ({
          ...prev,
          email: { ...prev.email, verified: true },
        }));
        setEmailCode("");

        toast({
          title: "Email verified",
          description: "Your email has been successfully verified",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: "Please try again",
      });
    }
  };

  const proceedTo2FA = () => {
    if (!verification.email.verified) {
      toast({
        variant: "destructive",
        title: "Verification required",
        description: "Please verify your email address to continue",
      });
      return;
    }
    setCurrentStep(3);
  };

  const handle2FAComplete = () => {
    setCurrentStep(4);
    toast({
      title: "Account activated!",
      description: "Welcome to BS Market! Your account is now fully set up.",
    });

    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 2000);
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step.completed
                  ? "bg-green-500 text-white"
                  : currentStep === step.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {step.completed ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="text-sm font-semibold">{step.id}</span>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">{step.title}</p>
              <p className="text-xs text-white/60">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`absolute h-0.5 w-24 top-5 ${
                  step.completed ? "bg-green-500" : "bg-gray-200"
                }`}
                style={{
                  left: `${(index + 1) * 25}%`,
                  transform: "translateX(-50%)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Step 2: Verification
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {renderStepIndicator()}

          <div className="mb-6 text-center text-white">
            <h1 className="text-3xl font-bold mb-2">
              Verify Your Email Address
            </h1>
            <p className="text-blue-200">
              We&apos;ve sent a 4-digit verification code to your email
            </p>
          </div>

          <div className="max-w-md mx-auto">
            {/* Email Verification */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-[10px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Mail className="w-5 h-5" />
                  Email Verification
                  {verification.email.verified && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white/80 text-sm">
                  Code sent to: {userEmail}
                </p>

                {!verification.email.verified && (
                  <>
                    <input
                      type="text"
                      value={emailCode}
                      onChange={(e) =>
                        setEmailCode(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      placeholder="Enter 4-digit code"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={4}
                    />

                    <div className="flex gap-2">
                      <Button
                        onClick={verifyEmail}
                        disabled={emailCode.length !== 4}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Verify Email
                      </Button>
                      <Button
                        onClick={() => sendEmailVerification(userEmail)}
                        disabled={verification.email.loading}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {verification.email.loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Resend"
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {verification.email.verified && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>Email verified successfully</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 text-center">
            <Button
              onClick={proceedTo2FA}
              disabled={!verification.email.verified}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              Continue to 2FA Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: 2FA Setup
  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {renderStepIndicator()}

          <TwoFactorSignupSetup onComplete={handle2FAComplete} />
        </div>
      </div>
    );
  }

  // Step 4: Complete
  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {renderStepIndicator()}

          <Card className="bg-white/10 border-white/20 backdrop-blur-[10px]">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-400" />
              </div>
              <CardTitle className="text-white text-2xl">
                Welcome to BS Market, {userName}!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-white/80">
                Your account has been successfully created and fully verified.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Email Verified</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Shield className="w-4 h-4" />
                  <span>2FA Enabled</span>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Redirecting to your dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 1: Account Information
  return (
    <AuthLayout
      title="Create Your Account"
      description={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-300 hover:text-blue-200 hover:underline transition-colors"
          >
            Sign in
          </Link>
          .
        </>
      }
      showLogo={false}
    >
      <div className="space-y-8">
        {renderStepIndicator()}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">
                Enhanced Security & Verification
              </p>
              <p className="text-sm text-blue-700">
                For your security, we&apos;ll verify your email address, then
                set up 2FA.
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(createAccount)}
            className="space-y-6"
          >
            <InputField
              control={form.control}
              name="name"
              label="Full Name"
              placeholder="John Silva"
              type="text"
              icon={<User className="h-5 w-5 text-gray-300" />}
              labelPosition="top"
            />

            <InputField
              control={form.control}
              name="email"
              label="Email"
              placeholder="john.silva@example.com"
              type="email"
              icon={<Mail className="h-5 w-5 text-gray-300" />}
              labelPosition="top"
            />

            <PhoneField
              value={form.watch("phone")}
              onChange={(value) => form.setValue("phone", value)}
              onBlur={() => form.trigger("phone")}
              error={form.formState.errors.phone?.message}
              required
            />

            <DocumentField
              value={form.watch("cpf")}
              onChange={(value) => form.setValue("cpf", value)}
              onBlur={() => form.trigger("cpf")}
              error={form.formState.errors.cpf?.message}
              required
            />

            <InputField
              control={form.control}
              name="password"
              label="Password"
              placeholder="••••••••"
              type="password"
              icon={<Lock className="h-5 w-5 text-gray-300" />}
              showPasswordToggle={true}
              labelPosition="top"
            />

            <InputField
              control={form.control}
              name="confirmPassword"
              label="Confirm Password"
              placeholder="••••••••"
              type="password"
              icon={<Lock className="h-5 w-5 text-gray-300" />}
              showPasswordToggle={true}
              labelPosition="top"
            />

            <Button
              type="submit"
              className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 h-12 text-base font-medium backdrop-blur-[10px] relative overflow-hidden"
              disabled={pending}
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 relative z-10" />
                  <span className="relative z-10">Creating Account...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Create Account</span>
                  <ArrowRight className="h-4 w-4 ml-2 relative z-10" />
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center text-xs text-gray-300">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            className="text-blue-300 hover:text-blue-200 hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-blue-300 hover:text-blue-200 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignupWithVerification;
