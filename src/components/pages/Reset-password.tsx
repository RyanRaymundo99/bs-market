"use client";
import React, { useState } from "react";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

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
import { authClient } from "@/lib/auth-client";
import { AuthLayout } from "@/components/ui/auth-layout";

const ResetPassword = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast({
        title: "Error",
        description: "Invalid reset token",
        variant: "destructive",
      });
      return;
    }

    setPending(true);
    try {
      const { error } = await authClient.resetPassword({
        token,
        newPassword: data.password,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Your password has been reset successfully",
        });
        router.push("/login");
      }
    } finally {
      setPending(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="Link de redefinição inválido"
        description="O link de redefinição de senha é inválido ou expirou"
        showLogo={true}
      >
        <div className="text-center space-y-4">
          <p className="text-gray-400">
            Por favor, solicite um novo link de redefinição de senha.
          </p>
          <Link href="/forgot-password">
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Solicitar novo link
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Redefinir senha"
      description="Digite sua nova senha"
      showBackButton={true}
      onBack={() => router.back()}
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
          className="font-medium text-blue-400 underline-offset-4 hover:text-blue-300 hover:underline transition-colors"
        >
          Voltar ao login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
