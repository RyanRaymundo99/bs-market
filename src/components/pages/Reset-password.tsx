"use client";
import React, { useState } from "react";
import { Lock, ArrowRight, Loader2, ArrowLeft } from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { InputField } from "@/components/Auth/FormFields";
import {
  ResetPasswordFormValues,
  resetPasswordSchema,
} from "@/lib/schema/resetPasswordSchema";
import { AuthLayout } from "@/components/ui/auth-layout";

const ResetPassword = () => {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<"verify" | "reset">(
    email ? "verify" : "reset"
  );
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const verifyCode = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Email não encontrado",
        variant: "destructive",
      });
      return;
    }

    if (!code || code.length !== 4) {
      toast({
        title: "Erro",
        description: "Por favor, insira o código de 4 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          code: code,
          type: "email",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setVerified(true);
        setStep("reset");
        toast({
          title: "Código verificado",
          description: "Agora defina sua nova senha",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Código de verificação inválido",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao verificar código",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          type: "email",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Código reenviado",
          description: "Um novo código foi enviado para seu email",
        });

        if (result.code) {
          toast({
            title: "Modo Desenvolvimento",
            description: `Código de redefinição: ${result.code}`,
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Falha ao reenviar código",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao reenviar código",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!email || !code) {
      toast({
        title: "Erro",
        description: "Email ou código não encontrado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          code: code,
          newPassword: data.password,
          type: "email",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Sua senha foi redefinida com sucesso",
        });
        router.push("/login");
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao redefinir senha",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao redefinir senha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If no email, show error
  if (!email && step === "verify") {
    return (
      <AuthLayout
        title="Link de redefinição inválido"
        description="O link de redefinição de senha é inválido ou expirou"
        showLogo={true}
      >
        <div className="text-center space-y-4">
          <p className="text-gray-400">
            Por favor, solicite um novo código de redefinição de senha.
          </p>
          <Link href="/forgot-password">
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Solicitar novo código
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Verify code step
  if (step === "verify" && email) {
    return (
      <AuthLayout
        title="Verificar código"
        description={`Digite o código de 4 dígitos enviado para ${email}`}
        showBackButton={true}
        onBack={() => router.push("/forgot-password")}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Código de verificação
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="Digite o código de 4 dígitos"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-lg font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              maxLength={4}
            />
          </div>

          <Button
            onClick={verifyCode}
            disabled={loading || code.length !== 4}
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 h-12 text-base font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              <>
                Verificar código <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <div className="flex justify-between text-sm">
            <button
              onClick={() => router.push("/forgot-password")}
              className="text-brand-300 hover:text-brand-400 hover:underline"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Voltar
            </button>
            <button
              onClick={resendCode}
              disabled={loading}
              className="text-brand-300 hover:text-brand-400 hover:underline"
            >
              Reenviar código
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Reset password step
  return (
    <AuthLayout
      title="Redefinir senha"
      description="Digite sua nova senha"
      showBackButton={true}
      onBack={() => setStep("verify")}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InputField
            control={form.control}
            name="password"
            label="Nova senha"
            placeholder="••••••••"
            type="password"
            icon={<Lock className="h-5 w-5 text-gray-400" />}
            showPasswordToggle={true}
          />

          <InputField
            control={form.control}
            name="confirmPassword"
            label="Confirmar nova senha"
            placeholder="••••••••"
            type="password"
            icon={<Lock className="h-5 w-5 text-gray-400" />}
            showPasswordToggle={true}
          />

          <Button
            type="submit"
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 h-12 text-base font-medium"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Aguarde...
              </>
            ) : (
              <>
                Redefinir senha <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center text-sm text-gray-400">
        Lembra da sua senha?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-300 underline-offset-4 hover:text-brand-400 hover:underline transition-colors"
        >
          Voltar ao login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
