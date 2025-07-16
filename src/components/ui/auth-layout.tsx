import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

const AuthLayout = ({
  children,
  title,
  description,
  showLogo = true,
  showBackButton = false,
  onBack,
}: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/80 p-4">
      <div className="w-full max-w-md">
        {showLogo && (
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-8 h-8 rounded-md bg-primary/90 flex items-center justify-center text-white font-bold">
                  📈
                </div>
                <h1 className="text-2xl font-bold">Build Strategy</h1>
              </div>
            </Link>
          </div>
        )}

        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-1">
            {showBackButton && onBack && (
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl font-bold flex-1 text-center">
                  {title}
                </CardTitle>
                <div className="w-10" /> {/* Spacer for centering */}
              </div>
            )}
            {!showBackButton && (
              <CardTitle className="text-2xl font-bold text-center">
                {title}
              </CardTitle>
            )}
            <CardDescription className="text-center">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export { AuthLayout };
