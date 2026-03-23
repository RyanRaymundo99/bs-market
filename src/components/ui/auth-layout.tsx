import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: React.ReactNode;
  showLogo?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

const AuthLayout = ({
  children,
  title,
  description,
  showLogo = false,
  showBackButton = false,
  onBack,
}: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden auth-layout">
      {/* Gradient shapes - theme primary (softer on bright theme via CSS) */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 via-primary/10 to-primary/15 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 animate-pulse auth-layout-orb" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-primary/15 via-primary/10 to-primary/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 animate-pulse auth-layout-orb" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-gradient-to-r from-primary/10 to-primary/15 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 animate-pulse auth-layout-orb" />
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-foreground/5 to-transparent rounded-full blur-sm" />
      <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-tl from-foreground/5 to-transparent rounded-full blur-sm" />
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-md p-6">
        <Card className="border border-border bg-card backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/5 opacity-50" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <CardHeader className="space-y-1 pb-6 relative z-10">
            {showLogo && (
              <div className="text-center">
                <Link href="/" className="inline-block">
                  <div className="h-24 ml-8 overflow-hidden flex items-center">
                    <Image
                      src="/shortname-logo.svg"
                      alt="Build Strategy"
                      width={200}
                      height={200}
                      className="h-auto"
                      priority
                    />
                  </div>
                </Link>
              </div>
            )}
            {showBackButton && onBack && (
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="mr-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl font-bold flex-1 text-center text-foreground">
                  {title}
                </CardTitle>
                <div className="w-10" />
              </div>
            )}
            {!showBackButton && (
              <CardTitle className="text-2xl font-bold text-center text-foreground">
                {title}
              </CardTitle>
            )}
            <CardDescription className="text-center text-muted-foreground">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export { AuthLayout };
