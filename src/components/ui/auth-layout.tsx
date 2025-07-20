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
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Enhanced gradient shapes with more pronounced effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/30 via-purple-600/20 to-cyan-500/25 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-cyan-500/30 via-blue-600/20 to-purple-500/25 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-gradient-to-r from-purple-500/20 via-pink-500/15 to-blue-500/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>

      {/* Additional floating elements for mirror effect */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-sm"></div>
      <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-tl from-white/5 to-transparent rounded-full blur-sm"></div>

      {/* Enhanced glass overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-md p-6">
        {showLogo && (
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                  📈
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Build Strategy
                </h1>
              </div>
            </Link>
          </div>
        )}

        <Card className="border border-white/10 bg-white/5 backdrop-blur-[20px] shadow-2xl shadow-black/50 relative overflow-hidden">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <CardHeader className="space-y-1 pb-6 relative z-10">
            {showBackButton && onBack && (
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="mr-2 text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl font-bold flex-1 text-center text-white">
                  {title}
                </CardTitle>
                <div className="w-10" /> {/* Spacer for centering */}
              </div>
            )}
            {!showBackButton && (
              <CardTitle className="text-2xl font-bold text-center text-white">
                {title}
              </CardTitle>
            )}
            <CardDescription className="text-center text-gray-300">
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
