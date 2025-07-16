"use client";
import React, { useState, useCallback } from "react";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
// import { GoogleAuthButton } from "@/components/Auth/GoogleAuthButton";
import { InputField, CheckboxField } from "@/components/Auth/FormFields";
import { LoginFormValues, loginSchema } from "@/lib/schema/loginSchema";
import { authClient } from "@/lib/auth-client";
import { AuthLayout } from "@/components/ui/auth-layout";
// import { Separator } from "@/components/ui/separator";

const Login = () => {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = useCallback(
    async (data: LoginFormValues) => {
      try {
        setPending(true);

        await authClient.signIn.email(
          {
            email: data.email,
            password: data.password,
            rememberMe: data.rememberMe,
          },
          {
            onSuccess: () => {
              router.push("/dashboard");
            },
            onError: (ctx) => {
              toast({
                variant: "destructive",
                title: "Erro no login",
                description:
                  ctx.error.message ?? "Ocorreu um erro ao fazer login",
              });
            },
          }
        );
      } catch {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: "Ocorreu um erro inesperado",
        });
      } finally {
        setPending(false);
      }
    },
    [router, toast]
  );

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      description="Digite suas credenciais para acessar sua conta"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="flex items-center justify-between">
            <CheckboxField
              control={form.control}
              name="rememberMe"
              label="Lembrar de mim"
            />

            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguarde...
              </>
            ) : (
              <>
                Entrar <ArrowRight className="h-4 w-4" />
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
        Não tem uma conta?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
