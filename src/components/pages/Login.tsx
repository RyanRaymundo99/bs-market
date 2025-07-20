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
import { InputField, CheckboxField } from "@/components/Auth/FormFields";
import { LoginFormValues, loginSchema } from "@/lib/schema/loginSchema";
import { authClient } from "@/lib/auth-client";
import { AuthLayout } from "@/components/ui/auth-layout";

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
      title="Build Strategy"
      description={
        <>
          Não tem uma conta?{" "}
          <Link
            href="/signup"
            className="text-blue-300 hover:text-blue-200 hover:underline transition-colors"
          >
            Criar conta
          </Link>
          .
        </>
      }
      showLogo={false}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InputField
            control={form.control}
            name="email"
            label="Email"
            placeholder="joao.silva@exemplo.com"
            type="email"
            icon={<Mail className="h-5 w-5 text-gray-300" />}
            labelPosition="top"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-300 hover:text-blue-200 hover:underline transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <InputField
              control={form.control}
              name="password"
              label="Senha"
              placeholder="••••••••"
              type="password"
              icon={<Lock className="h-5 w-5 text-gray-300" />}
              showPasswordToggle={true}
              labelPosition="top"
            />
          </div>

          <div className="flex items-center justify-between">
            <CheckboxField
              control={form.control}
              name="rememberMe"
              label="Lembrar de mim"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 h-12 text-base font-medium backdrop-blur-[10px] relative overflow-hidden"
            disabled={pending}
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
            }}
          >
            {/* Mirror effect for button */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2 relative z-10" />
                <span className="relative z-10">Aguarde...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">Entrar</span>
                <ArrowRight className="h-4 w-4 ml-2 relative z-10" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center text-xs text-gray-300">
        Ao fazer login, você concorda com nossos{" "}
        <Link
          href="/terms"
          className="text-blue-300 hover:text-blue-200 hover:underline"
        >
          Termos
        </Link>{" "}
        e{" "}
        <Link
          href="/privacy"
          className="text-blue-300 hover:text-blue-200 hover:underline"
        >
          Política de Privacidade
        </Link>
        .
      </div>
    </AuthLayout>
  );
};

export default Login;
