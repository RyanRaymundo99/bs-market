"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Lock, ArrowRight, Loader2, Home, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { InputField, CheckboxField } from "@/components/Auth/FormFields";
import { EmailField } from "@/components/Auth/EmailField";
import { AuthLayout } from "@/components/ui/auth-layout";

// Define the form values type locally since we're not using Zod anymore
interface LoginFormValues {
  emailOrCpf: string;
  password: string;
  rememberMe: boolean;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  remainingAttempts?: number;
  retryAfter?: number;
  user?: {
    id: string;
    email: string;
    name: string;
    approvalStatus: string;
    kycStatus: string;
  };
}

const REMEMBER_EMAIL_KEY = "remembered-email";
const REMEMBER_PASSWORD_KEY = "remembered-password";

const Login = () => {
  const [pending, setPending] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<LoginFormValues>({
    defaultValues: {
      emailOrCpf: "",
      password: "",
      rememberMe: false,
    },
  });

  // Autofill remembered credentials on mount and auto-focus
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    const rememberedPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY);
    if (rememberedEmail && rememberedPassword) {
      form.setValue("emailOrCpf", rememberedEmail);
      try {
        form.setValue("password", atob(rememberedPassword));
      } catch {
        form.setValue("password", "");
      }
      form.setValue("rememberMe", true);
    }

    // Auto-focus on email input after a short delay
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [form]);

  // Clear any existing form errors when component mounts
  useEffect(() => {
    form.clearErrors();
    setRemainingAttempts(null);
  }, [form]);

  const onSubmit = useCallback(
    async (data: LoginFormValues) => {
      // Custom validation
      if (!data.emailOrCpf.trim()) {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: "Email ou CPF é obrigatório",
        });
        return;
      }

      if (!data.password.trim()) {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: "Senha é obrigatória",
        });
        return;
      }

      try {
        setPending(true);

        // Use our simple custom login endpoint

        const response = await fetch("/api/auth/custom-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.emailOrCpf,
            password: data.password,
          }),
        });

        const result: ApiResponse = await response.json();

        if (response.ok && result.success) {
          setIsSuccess(true);

          // Show success message
          toast({
            title: "Login realizado com sucesso!",
            description: `Bem-vindo, ${result.user?.name || "usuário"}!`,
            duration: 2000,
          });

          // Remember Me logic with better security
          if (data.rememberMe) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, data.emailOrCpf);
            // Use a simple encoding (in production, consider more secure methods)
            localStorage.setItem(REMEMBER_PASSWORD_KEY, btoa(data.password));
          } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY);
            localStorage.removeItem(REMEMBER_PASSWORD_KEY);
          }

          // Store user session in localStorage for simple session management
          if (result.user) {
            localStorage.setItem("auth-user", JSON.stringify(result.user));
            localStorage.setItem("auth-session", "true");
          }

          // Mark that we just logged in to prevent back navigation
          sessionStorage.setItem("just-logged-in", "true");

          // Reset remaining attempts on success
          setRemainingAttempts(null);

          // Redirect to dashboard after a brief delay for better UX
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 500);
        } else {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = result.retryAfter || 0;
            const minutes = Math.ceil(retryAfter / 60);
            toast({
              variant: "destructive",
              title: "Muitas tentativas",
              description:
                result.error || `Tente novamente em ${minutes} minuto(s).`,
              duration: 5000,
            });
          } else {
            // Handle failed login attempts
            const attempts = result.remainingAttempts ?? null;
            setRemainingAttempts(attempts);

            toast({
              variant: "destructive",
              title: "Erro no login",
              description:
                result.error ||
                "Ocorreu um erro ao fazer login. Verifique suas credenciais.",
              duration: attempts !== null && attempts > 0 ? 4000 : 3000,
            });
          }
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro de conexão",
          description:
            "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
          duration: 4000,
        });
      } finally {
        setPending(false);
      }
    },
    [router, toast]
  );

  return (
    <div className="relative">
      {/* Home Icon Button */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 bg-black/60 backdrop-blur-[20px] border border-white/10 text-white hover:text-brand-300 hover:bg-black/80 rounded-lg transition-all duration-200"
        title="Voltar para a página inicial"
      >
        <Home className="w-5 h-5" />
      </Link>

      <AuthLayout
        title=""
        description={
          <>
            Não tem uma conta?{" "}
            <Link
              href="/signup"
              className="text-brand-300 hover:text-brand-400 hover:underline transition-colors"
            >
              Criar conta
            </Link>
            .
          </>
        }
        showLogo={true}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            aria-label="Formulário de login"
            noValidate
          >
            <div>
              <EmailField
                value={form.watch("emailOrCpf")}
                onChange={(value) => {
                  form.setValue("emailOrCpf", value);
                  setRemainingAttempts(null); // Clear attempts warning when user types
                }}
                required
                ref={emailInputRef}
                autoFocus
                aria-describedby={
                  remainingAttempts !== null ? "attempts-warning" : undefined
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <div
                    id="attempts-warning"
                    className="text-xs text-yellow-400 font-medium"
                    role="alert"
                    aria-live="polite"
                  >
                    {remainingAttempts} tentativa(s) restante(s)
                  </div>
                )}
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-brand-300 hover:text-brand-400 hover:underline transition-colors ml-auto"
                  aria-label="Recuperar senha esquecida"
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
                aria-describedby={
                  remainingAttempts !== null ? "attempts-warning" : undefined
                }
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
              className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 h-12 text-base font-medium backdrop-blur-[10px] relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={pending || isSuccess}
              aria-busy={pending}
              aria-label={pending ? "Processando login" : "Fazer login"}
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Mirror effect for button */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

              {isSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 relative z-10 text-green-400" />
                  <span className="relative z-10">Login realizado!</span>
                </>
              ) : pending ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin mr-2 relative z-10"
                    aria-hidden="true"
                  />
                  <span className="relative z-10">Aguarde...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Entrar</span>
                  <ArrowRight
                    className="h-4 w-4 ml-2 relative z-10"
                    aria-hidden="true"
                  />
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center text-xs text-gray-300">
          Ao fazer login, você concorda com nossos termos de serviço e política
          de privacidade.
        </div>
      </AuthLayout>
    </div>
  );
};

export default Login;
