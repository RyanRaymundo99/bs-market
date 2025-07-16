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
        title="Invalid Reset Link"
        description="The password reset link is invalid or has expired"
        showLogo={true}
      >
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Please request a new password reset link.
          </p>
          <Link href="/forgot-password">
            <Button variant="outline">Request New Link</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      description="Enter your new password"
      showBackButton={true}
      onBack={() => router.back()}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <InputField
            control={form.control}
            name="password"
            label="New Password"
            placeholder="••••••••"
            type="password"
            icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            showPasswordToggle={true}
          />

          <InputField
            control={form.control}
            name="confirmPassword"
            label="Confirm New Password"
            placeholder="••••••••"
            type="password"
            icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            showPasswordToggle={true}
          />

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : (
              <>
                Reset password <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center text-sm">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
