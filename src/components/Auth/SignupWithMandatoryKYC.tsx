"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, SignUpFormValues } from "@/lib/schema/signupSchema";
import {
  CheckCircle,
  Upload,
  Camera,
  FileText,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  PasswordField,
  ConfirmPasswordField,
} from "@/components/Auth/PasswordField";
import { DocumentField } from "@/components/Auth/DocumentField";
import {
  FormField,
  FormItem,
  FormControl,
  FormProvider,
} from "@/components/ui/form";

interface KYCDocumentData {
  documentFront?: File;
  documentBack?: File;
  documentSelfie?: File;
  // CNPJ documents
  contratoSocial?: File;
  cartaoCNPJ?: File;
  cnhSocioControlado?: File;
}

const SignupWithMandatoryKYC = () => {
  const [currentStep, setCurrentStep] = useState<"info" | "kyc" | "success">(
    "info"
  );
  const [userData, setUserData] = useState<SignUpFormValues | null>(null);
  const [kycData, setKycData] = useState<KYCDocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
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

  const createAccount = useCallback(
    async (data: SignUpFormValues) => {
      // Prevent multiple submissions
      if (loading) {
        return;
      }

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
            title: "Conta criada!",
            description: "Agora complete sua verificação de identidade",
          });

          // Store the session info for KYC submission
          if (result.sessionId) {
            // Session cookie should be set automatically by the server
            console.log("Account created, session ID:", result.sessionId);
          }
        } else {
          // Handle specific error messages
          let errorMessage =
            result.error || "Ocorreu um erro ao criar sua conta.";

          // Translate common error messages
          if (errorMessage.includes("email address")) {
            errorMessage =
              "Este email já está cadastrado. Use outro email ou faça login.";
          } else if (errorMessage.includes("CPF")) {
            errorMessage =
              "Este CPF já está cadastrado. Use outro CPF ou faça login.";
          } else if (errorMessage.includes("phone number")) {
            errorMessage =
              "Este telefone já está cadastrado. Use outro telefone ou faça login.";
          }

          toast({
            variant: "destructive",
            title: "Erro ao criar conta",
            description: errorMessage,
          });
        }
      } catch (error) {
        console.error("Signup error:", error);
        toast({
          variant: "destructive",
          title: "Erro ao criar conta",
          description: "Ocorreu um erro inesperado. Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, loading]
  );

  const handleKYCSubmit = async () => {
    if (!kycData || !userData) return;

    try {
      setUploading(true);

      // Upload KYC documents
      // First, we need to get the user's CPF from the account creation
      if (!userData?.cpf) {
        toast({
          variant: "destructive",
          title: "Erro ao enviar documentos",
          description:
            "CPF não encontrado. Por favor, complete seu cadastro primeiro.",
        });
        return;
      }

      const formData = new FormData();
      const cleanDocument = userData.cpf.replace(/\D/g, "");
      const isCNPJ = cleanDocument.length === 14;
      
      if (isCNPJ) {
        // CNPJ documents
        formData.append("documentType", "CNPJ");
        formData.append("cpf", userData.cpf);
        formData.append("contratoSocial", kycData.contratoSocial || kycData.documentFront);
        formData.append("cartaoCNPJ", kycData.cartaoCNPJ || kycData.documentBack);
        formData.append("cnhSocioControlado", kycData.cnhSocioControlado || kycData.documentSelfie);
      } else {
        // CPF documents
        formData.append("documentType", "RG"); // Default document type
        formData.append("documentNumber", ""); // Optional field
        formData.append("cpf", userData.cpf);
        formData.append("documentFront", kycData.documentFront);
        formData.append("documentBack", kycData.documentBack);
        formData.append("documentSelfie", kycData.documentSelfie);
      }

      const response = await fetch("/api/auth/submit-kyc", {
        method: "POST",
        body: formData,
        credentials: "include", // Ensure cookies are sent
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
        setCurrentStep("success");
        toast({
          title: "KYC Enviado!",
          description: "Seus documentos foram enviados para revisão",
        });
      } else {
        // Use the error message from the server (already user-friendly)
        const errorMessage =
          result.error ||
          "Falha ao enviar documentos KYC. Por favor, tente novamente.";

        toast({
          variant: "destructive",
          title: "Falha no Envio do KYC",
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error("KYC submission error:", error);
      toast({
        variant: "destructive",
        title: "Falha no Envio do KYC",
        description:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado. Por favor, verifique sua conexão com a internet e tente novamente.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (type: keyof KYCDocumentData, file: File) => {
    setKycData(
      (prev) =>
        ({
          ...prev,
          [type]: file,
        } as KYCDocumentData)
    );
  };

  const onSubmit = (data: SignUpFormValues) => {
    createAccount(data);
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        <div
          className={`flex items-center space-x-2 ${
            currentStep === "info" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "info"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            1
          </div>
          <span className="text-sm font-medium">Informações da Conta</span>
        </div>
        <div className="w-8 h-px bg-border"></div>
        <div
          className={`flex items-center space-x-2 ${
            currentStep === "kyc" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "kyc"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            2
          </div>
          <span className="text-sm font-medium">Documentos KYC</span>
        </div>
        <div className="w-8 h-px bg-border"></div>
        <div
          className={`flex items-center space-x-2 ${
            currentStep === "success" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "success"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            3
          </div>
          <span className="text-sm font-medium">Concluir</span>
        </div>
      </div>
    </div>
  );

  if (currentStep === "success") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Conta Criada!</CardTitle>
          <p className="text-muted-foreground">
            Sua conta foi criada e seus documentos KYC foram enviados para
            revisão. Você será notificado assim que sua conta for aprovada.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => router.push("/dashboard?kyc=pending")}
            className="w-full"
          >
            Ir para o Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Criar Conta</CardTitle>
        <p className="text-muted-foreground text-center">
          Complete seu cadastro com verificação KYC
        </p>
        {renderStepIndicator()}
      </CardHeader>
      <CardContent>
        {currentStep === "info" && (
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" {...form.register("name")} className="mt-1" />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  className="mt-1"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  className="mt-1"
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <DocumentField
                value={form.watch("cpf")}
                onChange={(value) => form.setValue("cpf", value)}
                onBlur={() => form.trigger("cpf")}
                error={form.formState.errors.cpf?.message}
                required
              />

              <PasswordField
                control={form.control}
                name="password"
                label="Senha"
                placeholder="Digite sua senha"
                description="A senha precisa seguir os padrões listados abaixo do campo"
              />

              <ConfirmPasswordField
                control={form.control}
                name="confirmPassword"
                passwordValue={form.watch("password")}
                label="Confirme sua senha"
                placeholder="Digite sua senha novamente"
              />

              {/* Marketing Opt-in Checkbox */}
              <FormField
                control={form.control}
                name="acceptMarketing"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-gray-700 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 bg-black/50 backdrop-blur-[5px] mt-1"
                        />
                      </FormControl>
                      <label
                        htmlFor="acceptMarketing"
                        className="text-sm text-foreground leading-relaxed cursor-pointer flex-1"
                        onClick={() => field.onChange(!field.value)}
                      >
                        Aceito receber e-mail ou SMS da{" "}
                        <span className="bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                          bsmarket
                        </span>
                        . Você pode cancelar depois.
                      </label>
                    </div>
                  </FormItem>
                )}
              />

              {/* Terms and Privacy Checkbox */}
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-gray-700 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 bg-black/50 backdrop-blur-[5px] mt-1"
                        />
                      </FormControl>
                      <label
                        htmlFor="acceptTerms"
                        className="text-sm text-foreground leading-relaxed cursor-pointer flex-1"
                        onClick={() => field.onChange(!field.value)}
                      >
                        Ao criar a conta, aceito os termos do{" "}
                        <Link
                          href="/terms"
                          className="text-yellow-400 hover:text-yellow-300 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Contrato de Prestação de Serviços
                        </Link>{" "}
                        e{" "}
                        <Link
                          href="/privacy"
                          className="text-yellow-400 hover:text-yellow-300 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Política de Privacidade
                        </Link>
                        .
                      </label>
                    </div>
                    {form.formState.errors.acceptTerms && (
                      <p className="text-sm text-red-500 mt-2 ml-7">
                        {form.formState.errors.acceptTerms.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando Conta...
                  </>
                ) : (
                  <>
                    Criar Conta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </FormProvider>
        )}

        {currentStep === "kyc" && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {(() => {
                  const cleanDoc = userData?.cpf?.replace(/\D/g, "") || "";
                  return cleanDoc.length === 14
                    ? "Verificação de Documentos CNPJ"
                    : "Verificação de Identidade Obrigatória";
                })()}
              </h3>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const cleanDoc = userData?.cpf?.replace(/\D/g, "") || "";
                  return cleanDoc.length === 14
                    ? "Por favor, envie os documentos da empresa para completar a configuração da sua conta."
                    : "Por favor, envie seus documentos de identidade para completar a configuração da sua conta.";
                })()}
              </p>
            </div>

            <div className="space-y-4">
              {(() => {
                const cleanDoc = userData?.cpf?.replace(/\D/g, "") || "";
                const isCNPJ = cleanDoc.length === 14;

                if (isCNPJ) {
                  // CNPJ documents
                  return (
                    <>
                      {/* Contrato Social */}
                      <div>
                        <Label>Contrato Social (PDF)</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          {kycData?.contratoSocial ? (
                            <div className="space-y-2">
                              <FileText className="w-8 h-8 mx-auto text-green-500" />
                              <p className="text-sm text-green-600">
                                {kycData.contratoSocial.name}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 mx-auto text-gray-400" />
                              <p className="text-sm text-gray-500">
                                Clique para enviar o Contrato Social em PDF
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("contratoSocial", file);
                          }}
                          className="hidden"
                          id="contrato-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("contrato-upload")?.click()
                          }
                          className="w-full mt-2"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar Contrato Social
                        </Button>
                      </div>

                      {/* Cartão CNPJ */}
                      <div>
                        <Label>Cartão CNPJ (PDF)</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          {kycData?.cartaoCNPJ ? (
                            <div className="space-y-2">
                              <FileText className="w-8 h-8 mx-auto text-green-500" />
                              <p className="text-sm text-green-600">
                                {kycData.cartaoCNPJ.name}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 mx-auto text-gray-400" />
                              <p className="text-sm text-gray-500">
                                Clique para enviar o Cartão CNPJ em PDF
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("cartaoCNPJ", file);
                          }}
                          className="hidden"
                          id="cartao-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("cartao-upload")?.click()
                          }
                          className="w-full mt-2"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar Cartão CNPJ
                        </Button>
                      </div>

                      {/* CNH do Sócio Controlado */}
                      <div>
                        <Label>CNH do Sócio Controlado (PDF)</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          {kycData?.cnhSocioControlado ? (
                            <div className="space-y-2">
                              <FileText className="w-8 h-8 mx-auto text-green-500" />
                              <p className="text-sm text-green-600">
                                {kycData.cnhSocioControlado.name}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 mx-auto text-gray-400" />
                              <p className="text-sm text-gray-500">
                                Clique para enviar a CNH do sócio controlado em PDF
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect("cnhSocioControlado", file);
                          }}
                          className="hidden"
                          id="cnh-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("cnh-upload")?.click()
                          }
                          className="w-full mt-2"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar CNH do Sócio
                        </Button>
                      </div>
                    </>
                  );
                }
              })()}
            </div>
              <div>
                <Label>Frente do Documento (RG/Passaporte)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycData?.documentFront ? (
                    <div className="space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-green-500" />
                      <p className="text-sm text-green-600">
                        {kycData.documentFront.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Clique para enviar a frente do documento
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect("documentFront", file);
                  }}
                  className="hidden"
                  id="front-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("front-upload")?.click()
                  }
                  className="w-full mt-2"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Frente do Documento
                </Button>
              </div>

              {/* Document Back */}
              <div>
                <Label>Verso do Documento (RG/Passaporte)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycData?.documentBack ? (
                    <div className="space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-green-500" />
                      <p className="text-sm text-green-600">
                        {kycData.documentBack.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Clique para enviar o verso do documento
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect("documentBack", file);
                  }}
                  className="hidden"
                  id="back-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("back-upload")?.click()
                  }
                  className="w-full mt-2"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Verso do Documento
                </Button>
              </div>

              {/* Selfie */}
              <div>
                <Label>Selfie com Documento</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {kycData?.documentSelfie ? (
                    <div className="space-y-2">
                      <Camera className="w-8 h-8 mx-auto text-green-500" />
                      <p className="text-sm text-green-600">
                        {kycData.documentSelfie.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Clique para enviar selfie com documento
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect("documentSelfie", file);
                  }}
                  className="hidden"
                  id="selfie-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("selfie-upload")?.click()
                  }
                  className="w-full mt-2"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Enviar Selfie
                </Button>
              </div>
                    </>
                  );
                }
              })()}
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("info")}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleKYCSubmit}
                disabled={
                  (() => {
                    const cleanDoc = userData?.cpf?.replace(/\D/g, "") || "";
                    const isCNPJ = cleanDoc.length === 14;
                    if (isCNPJ) {
                      return (
                        !kycData?.contratoSocial ||
                        !kycData?.cartaoCNPJ ||
                        !kycData?.cnhSocioControlado ||
                        uploading
                      );
                    } else {
                      return (
                        !kycData?.documentFront ||
                        !kycData?.documentBack ||
                        !kycData?.documentSelfie ||
                        uploading
                      );
                    }
                  })()
                }
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar KYC
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignupWithMandatoryKYC;
