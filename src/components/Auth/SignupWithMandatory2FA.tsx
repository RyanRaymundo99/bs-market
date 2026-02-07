"use client";

import React, { useState, useCallback } from "react";
import { Mail, Lock, User, ArrowRight, Loader2, Shield, CheckCircle } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { InputField } from "@/components/Auth/FormFields";
import { DocumentField } from "@/components/Auth/DocumentField";
import { SignUpFormValues, signUpSchema } from "@/lib/schema/signupSchema";
import { AuthLayout } from "@/components/ui/auth-layout";
import { TwoFactorSetup } from "@/components/Auth/TwoFactorSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

const SignupWithMandatory2FA = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setUserCreated] = useState(false);
  const [, setSessionToken] = useState("");
  const [userName, setUserName] = useState("");
  
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

  const steps: SignupStep[] = [
    {
      id: 1,
      title: "Account Information",
      description: "Enter your personal details",
      completed: currentStep > 1,
    },
    {
      id: 2,
      title: "Setup 2FA",
      description: "Secure your account with two-factor authentication",
      completed: currentStep > 2,
    },
    {
      id: 3,
      title: "Complete",
      description: "Account setup finished",
      completed: currentStep > 3,
    },
  ];

  const createAccount = useCallback(
    async (data: SignUpFormValues) => {
      try {
        setPending(true);

        const response = await fetch("/api/auth/signup-with-2fa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            cpf: data.cpf,
            password: data.password,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          setUserCreated(true);
          setSessionToken(result.sessionId);
          setUserName(data.name);
          setCurrentStep(2);
          toast({
            title: "Account created!",
            description: "Now let&apos;s secure your account with 2FA",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error creating account",
            description: result.error || "An error occurred while creating your account.",
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
    [toast]
  );

  const handle2FAComplete = () => {
    setCurrentStep(3);
    toast({
      title: "Setup Complete!",
      description: "Your account is now secure with 2FA enabled",
    });
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 2000);
  };

  const handle2FACancel = () => {
    // If user cancels 2FA setup, we need to delete the account or mark it as incomplete
    toast({
      title: "Setup Required",
      description: "2FA is required for all new accounts. Please complete the setup.",
      variant: "destructive",
    });
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center">
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
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`absolute h-0.5 w-24 top-5 ${
                  step.completed ? "bg-green-500" : "bg-gray-200"
                }`}
                style={{
                  left: `${(index + 1) * 33.33}%`,
                  transform: "translateX(-50%)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {renderStepIndicator()}
          
          <div className="mb-6 text-center text-white">
            <h1 className="text-3xl font-bold mb-2">Secure Your Account</h1>
            <p className="text-blue-200">
              Two-factor authentication is required for all BS Market accounts
            </p>
          </div>

          <TwoFactorSetup
            onComplete={handle2FAComplete}
            onCancel={handle2FACancel}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
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
                Your account has been created successfully and secured with two-factor authentication.
              </p>
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Account secured with 2FA</span>
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
              <p className="font-medium text-blue-800">Enhanced Security Required</p>
              <p className="text-sm text-blue-700">
                All BS Market accounts require two-factor authentication for your security.
                You&apos;ll set this up after creating your account.
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(createAccount)} className="space-y-6">
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
                  <span className="relative z-10">Create Account & Setup 2FA</span>
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

export default SignupWithMandatory2FA;

