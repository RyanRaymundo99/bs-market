"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { InputField } from "@/components/Auth/FormFields";
import { DocumentField } from "@/components/Auth/DocumentField";
import { PhoneField } from "@/components/Auth/PhoneField";
import { SignUpFormValues, signUpSchema } from "@/lib/schema/signupSchema";
import { AuthLayout } from "@/components/ui/auth-layout";
import { DocumentUpload } from "@/components/Auth/DocumentUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  CheckCircle,
  Loader2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface KYCDocumentData {
  documentType: string;
  documentNumber: string;
  cpf: string;
  documentFront?: File;
  documentBack?: File;
  documentSelfie?: File;
  // CNPJ documents
  contratoSocial?: File;
  cartaoCNPJ?: File;
  cnhSocioControlado?: File;
}

const SignupWithKYC = () => {
  const [currentStep, setCurrentStep] = useState<"info" | "kyc" | "success">(
    "info"
  );
  const [, setUserData] = useState<SignUpFormValues | null>(null);
  const [, setKycData] = useState<KYCDocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Redirect to dashboard after showing success message
  useEffect(() => {
    if (currentStep === "success") {
      const timer = setTimeout(() => {
        router.push("/dashboard?kyc=pending");
      }, 3000); // Redirect after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [currentStep, router]);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      password: "",
      confirmPassword: "",
    },
  });

  const createAccount = useCallback(
    async (data: SignUpFormValues) => {
      try {
        setLoading(true);

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
          setUserData(data);
          setCurrentStep("kyc");
          toast({
            title: "Account created!",
            description: "Now please complete your identity verification",
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
        setLoading(false);
      }
    },
    [toast]
  );

  const submitKYC = useCallback(
    async (data: KYCDocumentData) => {
      try {
        setLoading(true);

        // Create FormData for file upload
        const formData = new FormData();
        formData.append("documentType", data.documentType);
        formData.append("documentNumber", data.documentNumber || "");
        formData.append("cpf", data.cpf);
        
        // Handle CNPJ or CPF documents
        if (data.contratoSocial && data.cartaoCNPJ && data.cnhSocioControlado) {
          formData.append("contratoSocial", data.contratoSocial);
          formData.append("cartaoCNPJ", data.cartaoCNPJ);
          formData.append("cnhSocioControlado", data.cnhSocioControlado);
        } else {
          if (data.documentFront) formData.append("documentFront", data.documentFront);
          if (data.documentBack) formData.append("documentBack", data.documentBack);
          if (data.documentSelfie) formData.append("documentSelfie", data.documentSelfie);
        }

        const response = await fetch("/api/auth/submit-kyc", {
          method: "POST",
          body: formData,
        });

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        interface ApiResponse {
          error?: string;
          success?: boolean;
          message?: string;
        }
        let result: ApiResponse = {
          error: "Ocorreu um erro inesperado. Por favor, tente novamente.",
        };

        if (contentType && contentType.includes("application/json")) {
          try {
            result = (await response.json()) as ApiResponse;
          } catch (jsonError) {
            console.error("Failed to parse JSON response:", jsonError);
            await response.text(); // Consume the response
            result = {
              error:
                "Não foi possível processar a resposta do servidor. Por favor, verifique sua conexão com a internet e tente novamente.",
            };
          }
        } else {
          // Handle non-JSON responses (like 403 Forbidden plain text)
          const text = await response.text();
          result = {
            error:
              text ||
              "Ocorreu um erro ao enviar os documentos. Por favor, verifique sua conexão com a internet e tente novamente.",
          };
        }

        if (response.ok) {
          setKycData(data);
          setCurrentStep("success");
          toast({
            title: "KYC Enviado!",
            description: "Seus documentos foram enviados para revisão",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao enviar documentos",
            description:
              result.error ||
              "Não foi possível enviar os documentos. Por favor, tente novamente.",
          });
        }
      } catch (error) {
        console.error("KYC submission error:", error);
        toast({
          variant: "destructive",
          title: "Erro ao enviar documentos",
          description:
            "Ocorreu um erro inesperado. Por favor, verifique sua conexão com a internet e tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const handleKYCComplete = (data: KYCDocumentData) => {
    submitKYC(data);
  };

  const handleBackToInfo = () => {
    setCurrentStep("info");
  };

  // const handleSuccess = () => {
  //   setTimeout(() => {
  //     window.location.href = "/dashboard";
  //   }, 3000);
  // };

  // Step 1: Account Information
  if (currentStep === "info") {
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
          {/* Security Notice */}
          <div className="bg-blue-50/10 border border-blue-200/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-200 mb-1">
                  Enhanced Security & Verification
                </p>
                <p className="text-sm text-blue-200/80">
                  After creating your account, you&apos;ll need to verify your
                  identity with a valid document (RG or Driver&apos;s License)
                  to access all features.
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
                disabled={loading}
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                {loading ? (
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
  }

  // Step 2: KYC Verification
  if (currentStep === "kyc") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="mb-6 text-center text-white">
            <h1 className="text-3xl font-bold mb-2 text-white">
              Identity Verification
            </h1>
            <p className="text-gray-300">
              Please upload your identity document and take a selfie for
              verification
            </p>
          </div>

          <DocumentUpload
            onComplete={handleKYCComplete}
            onBack={handleBackToInfo}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  // Step 3: Success
  if (currentStep === "success") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-400" />
              </div>
              <CardTitle className="text-white text-2xl">
                Account Created Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-white/80">
                Your account has been created and your documents have been
                submitted for verification.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Account Created</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <FileText className="w-4 h-4" />
                  <span>Documents Submitted</span>
                </div>
              </div>
              <p className="text-white/60 text-sm">
                Your documents are being reviewed by our team. You&apos;ll
                receive an email notification once verification is complete.
                This usually takes 1-2 business days.
              </p>
              <p className="text-white/60 text-sm">
                Redirecting to your dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};

export default SignupWithKYC;
