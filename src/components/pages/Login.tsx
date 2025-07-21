"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Mail, Lock, ArrowRight, Loader2, Code, Trash2 } from "lucide-react";
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
import { SessionManager } from "@/lib/session";

const Login = () => {
  const [pending, setPending] = useState(false);
  const [hasDevSession, setHasDevSession] = useState(false);
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

  // Check for existing dev session on mount
  useEffect(() => {
    const sessionInfo = SessionManager.getSessionInfo();
    setHasDevSession(sessionInfo.isValid);
  }, []);

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

  const handleDevAccess = () => {
    SessionManager.createSession({
      email: "dev@buildstrategy.com",
      name: "Developer",
      role: "developer",
    });

    setHasDevSession(true);

    toast({
      title: "Dev Access Granted",
      description: "Welcome, Developer! You'll stay logged in for 1 hour.",
    });

    // Redirect to dashboard
    router.push("/dashboard");
  };

  const clearDevSession = () => {
    SessionManager.clearSession();
    setHasDevSession(false);

    toast({
      title: "Dev Session Cleared",
      description: "Developer session has been cleared",
    });
  };

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

      {/* Developer Access Section */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleDevAccess}
            variant="ghost"
            className="flex-1 text-xs text-gray-400 hover:text-blue-300 hover:bg-white/5 transition-all duration-200 h-8 relative overflow-hidden"
          >
            {/* Mirror effect for button */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/2 opacity-20 pointer-events-none rounded-md"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <Code className="h-3 w-3 mr-2 relative z-10" />
            <span className="relative z-10">
              {hasDevSession ? "DEV: Acessar Dashboard" : "DEV: Acesso Direto"}
            </span>
          </Button>

          {hasDevSession && (
            <Button
              type="button"
              onClick={clearDevSession}
              variant="ghost"
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 h-8 px-2 relative overflow-hidden"
              title="Clear Dev Session"
            >
              <Trash2 className="h-3 w-3 relative z-10" />
            </Button>
          )}
        </div>

        {hasDevSession && (
          <div className="mt-2 text-xs text-yellow-400 text-center">
            ⚠️ Dev session active - dev@buildstrategy.com
          </div>
        )}
      </div>

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
