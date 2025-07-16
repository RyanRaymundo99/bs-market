"use client";
import React, { useState, useCallback } from "react";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
// import { GoogleAuthButton } from "@/components/Auth/GoogleAuthButton";
import { InputField } from "@/components/Auth/FormFields";
import { SignUpFormValues, signUpSchema } from "@/lib/schema/signupSchema";
import { authClient } from "@/lib/auth-client";
import { AuthLayout } from "@/components/ui/auth-layout";
// import { Separator } from "@/components/ui/separator";

const Signup = () => {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  const onSubmit = useCallback(
    async (data: SignUpFormValues) => {
      try {
        setPending(true);

        await authClient.signUp.email(
          {
            email: data.email,
            password: data.password,
            name: data.name,
          },
          {
            onSuccess: () => {
              toast({
                title: "Conta criada",
                description:
                  "Sua conta foi criada com sucesso. Verifique seu email para confirmar.",
              });
            },
            onError: (ctx) => {
              toast({
                variant: "destructive",
                title: "Erro ao criar conta",
                description:
                  ctx.error.message ?? "Ocorreu um erro ao criar a conta.",
              });
            },
          }
        );
      } catch {
        toast({
          variant: "destructive",
          title: "Erro ao criar conta",
          description: "Ocorreu um erro inesperado",
        });
      } finally {
        setPending(false);
      }
    },
    [toast]
  );

  return (
    <AuthLayout
      title="Criar uma conta"
      description="Digite suas informações para criar sua conta"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <InputField
            control={form.control}
            name="name"
            label="Nome completo"
            placeholder="João Silva"
            type="text"
            icon={<User className="h-5 w-5 text-muted-foreground" />}
          />

          <InputField
            control={form.control}
            name="email"
            label="Email"
            placeholder="joao.silva@exemplo.com"
            type="email"
            icon={<Mail className="h-5 w-5 text-muted-foreground" />}
          />

          <InputField
            control={form.control}
            name="password"
            label="Senha"
            placeholder="••••••••"
            type="password"
            icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            showPasswordToggle={true}
          />

          <InputField
            control={form.control}
            name="confirmPassword"
            label="Confirmar senha"
            placeholder="••••••••"
            type="password"
            icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            showPasswordToggle={true}
          />

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguarde...
              </>
            ) : (
              <>
                Criar conta <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Google Authentication - Temporarily Hidden */}
      {/* 
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Ou continue com
            </span>
          </div>
        </div>

        <div className="mt-4">
          <GoogleAuthButton
            action="login"
            buttonText="Entrar com Google"
            redirectTo="/dashboard"
          />
        </div>
      </div>
      */}

      <div className="mt-6 text-center text-sm">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Fazer login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Signup;
