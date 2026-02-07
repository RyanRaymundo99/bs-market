"use client";
import React, { useState, useCallback } from "react";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { InputField } from "@/components/Auth/FormFields";
import { DocumentField } from "@/components/Auth/DocumentField";
import { PhoneField } from "@/components/Auth/PhoneField";
import { SignUpFormValues, signUpSchema } from "@/lib/schema/signupSchema";
import { AuthLayout } from "@/components/ui/auth-layout";
import { PasswordStrengthGuide } from "@/components/ui/password-strength-guide";

const Signup = () => {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema) as Resolver<SignUpFormValues>,
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
  const [pending, setPending] = useState(false);
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
          sessionStorage.setItem("show-welcome-tutorial", "1");
          sessionStorage.setItem("welcome-tutorial-name", data.name || "");
          toast({
            title: "Conta criada com sucesso!",
            description: "Bem-vindo ao BS Market! Redirecionando...",
          });
          window.location.href = "/dashboard";
          return;
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

  return (
    <AuthLayout
      title="Criar uma conta"
      description={
        <>
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            Fazer login
          </Link>
          .
        </>
      }
      showLogo={false}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const firstError = Object.values(errors)[0]?.message;
            if (firstError) {
              toast({
                variant: "destructive",
                title: "Verifique o formulário",
                description: firstError,
              });
            }
          })}
          className="space-y-6"
        >
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

          <DocumentField
            value={form.watch("cpf")}
            onChange={(value) => form.setValue("cpf", value)}
            onBlur={() => form.trigger("cpf")}
            error={form.formState.errors.cpf?.message}
            required
            label="CPF ou CNPJ"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
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
          <PasswordStrengthGuide
            password={form.watch("password") ?? ""}
            className="mt-1"
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

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-gray-500 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500 bg-white/5 mt-0.5"
                    />
                  </FormControl>
                  <label
                    htmlFor="acceptTerms"
                    className="text-sm text-gray-300 leading-relaxed cursor-pointer flex-1"
                    onClick={() => field.onChange(!field.value)}
                  >
                    Ao criar a conta, aceito os{" "}
                    <Link
                      href="/terms"
                      className="text-blue-300 hover:text-blue-200 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos
                    </Link>{" "}
                    e{" "}
                    <Link
                      href="/privacy"
                      className="text-blue-300 hover:text-blue-200 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </label>
                </div>
                {form.formState.errors.acceptTerms && (
                  <p className="text-sm text-red-400 mt-1">
                    {form.formState.errors.acceptTerms.message}
                  </p>
                )}
              </FormItem>
            )}
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
    </AuthLayout>
  );
};

export default Signup;
