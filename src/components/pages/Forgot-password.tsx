"use client";
import React, { useState } from "react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { InputField } from "@/components/Auth/FormFields";
import {
  ForgotPasswordFormValues,
  forgotPasswordSchema,
} from "@/lib/schema/forgotPasswordSchema";
import { AuthLayout } from "@/components/ui/auth-layout";

const ForgotPassword = () => {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: data.email,
          type: "email",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Código enviado",
          description: "Um código de verificação foi enviado para seu email",
          variant: "default",
        });

        // Show dev code in development
        if (result.code) {
          toast({
            title: "Modo Desenvolvimento",
            description: `Código de redefinição: ${result.code}`,
          });
        }

        // Redirect to reset password page with email in query params
        router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao enviar código de redefinição",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar código de redefinição",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="Esqueceu a senha?"
      description="Digite seu email para receber um código de redefinição de senha"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InputField
            control={form.control}
            name="email"
            label="Email"
            placeholder="joao.silva@exemplo.com"
            type="email"
            icon={<Mail className="h-5 w-5 text-gray-400" />}
          />

          <Button
            type="submit"
            className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 hover:border-gray-600 transition-all duration-200 h-12 text-base font-medium"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Aguarde...
              </>
            ) : (
              <>
                Enviar código de redefinição{" "}
                <ArrowRight className="h-4 w-4 ml-2" />
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

export default ForgotPassword;
