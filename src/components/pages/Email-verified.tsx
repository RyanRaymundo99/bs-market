import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const EmailVerified = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden p-4">
      {/* Abstract gradient shapes in corners */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>

      {/* Glass overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="border border-gray-800/50 bg-gray-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              Email verificado!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center pt-0">
            <p className="text-gray-400">
              Seu endereço de email foi verificado com sucesso. Agora você pode
              acessar todas as funcionalidades.
            </p>

            <Link href="/dashboard" className="w-full block">
              <Button
                className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 hover:border-gray-600 transition-all duration-200 h-12 text-base font-medium"
                size="lg"
              >
                Ir para o Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerified;
