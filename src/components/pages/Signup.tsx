"use client";
import React, { useState, useCallback } from "react";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { InputField } from "@/components/Auth/FormFields";
import { CPFField } from "@/components/Auth/CPFField";
import { PhoneField } from "@/components/Auth/PhoneField";
import { SignUpFormValues, signUpSchema } from "@/lib/schema/signupSchema";
import { AuthLayout } from "@/components/ui/auth-layout";
import { WelcomeTutorial } from "@/components/ui/welcome-tutorial";

const Signup = () => {
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
  const [pending, setPending] = useState(false);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  const onSubmit = useCallback(
    async (data: SignUpFormValues) => {
      try {
        setPending(true);

        const response = await fetch("/api/auth/signup", {
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
          setUserName(data.name);
          setShowWelcomeTutorial(true);
          toast({
            title: "Conta criada com sucesso!",
            description: "Bem-vindo ao BS Market! Vamos começar.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao criar conta",
            description: result.error || "Ocorreu um erro ao criar a conta.",
          });
        }
      } catch (error) {
        console.error("Signup error:", error);
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

  const handleTutorialClose = () => {
    setShowWelcomeTutorial(false);
    // Redirect to dashboard after tutorial closes
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  };

  return (
    <AuthLayout
      title="Criar uma conta"
      description={
        <>
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="text-brand-300 hover:text-brand-400 hover:underline transition-colors"
          >
            Fazer login
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
            name="name"
            label="Nome completo"
            placeholder="João Silva"
            type="text"
            icon={<User className="h-5 w-5 text-gray-300" />}
            labelPosition="top"
          />

          <InputField
            control={form.control}
            name="email"
            label="Email"
            placeholder="joao.silva@exemplo.com"
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
            label="Telefone"
            placeholder="(11) 99999-9999"
          />

          <CPFField
            value={form.watch("cpf")}
            onChange={(value) => form.setValue("cpf", value)}
            onBlur={() => form.trigger("cpf")}
            error={form.formState.errors.cpf?.message}
            required
          />

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

          <InputField
            control={form.control}
            name="confirmPassword"
            label="Confirmar senha"
            placeholder="••••••••"
            type="password"
            icon={<Lock className="h-5 w-5 text-gray-300" />}
            showPasswordToggle={true}
            labelPosition="top"
          />

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
                <span className="relative z-10">Criar conta</span>
                <ArrowRight className="h-4 w-4 ml-2 relative z-10" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center text-xs text-gray-300">
        Ao criar uma conta, você concorda com nossos{" "}
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

      <WelcomeTutorial
        isOpen={showWelcomeTutorial}
        onClose={handleTutorialClose}
        userName={userName}
      />
    </AuthLayout>
  );
};

export default Signup;
