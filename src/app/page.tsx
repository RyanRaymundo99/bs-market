import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Zap, BarChart3, ArrowRight } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/60 backdrop-blur-[20px] supports-[backdrop-filter]:bg-black/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Build Strategy</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-white hover:text-blue-300 hover:bg-white/10"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden">
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="relative z-10">Get Started</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-8">
          <Badge className="mb-4 bg-white/10 text-white border-white/20">
            <Zap className="w-4 h-4 mr-2" />
            Next-Gen Investment Platform
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-white">
            Invista de Forma Mais Inteligente com
            <span className="text-gradient block">Build Strategy</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experimente o futuro dos investimentos com nossa plataforma. Obtenha
            insights em tempo real, estratégias de negociação automatizadas e
            gerenciamento profissional de portfólio em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="relative z-10">Começar a Investir Agora</span>
                <ArrowRight className="w-4 h-4 ml-2 relative z-10" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                }}
              >
                {/* Mirror effect for button */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="relative z-10">Entrar no Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Why Choose BS Consulting?
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Our platform combines cutting-edge technology with proven investment
            strategies
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-black/60 border border-white/10 rounded-xl shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <CardContent className="p-6 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 border border-white/20">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                AI-Powered Insights
              </h3>
              <p className="text-gray-300">
                Get real-time market analysis and personalized investment
                recommendations powered by advanced machine learning algorithms.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border border-white/10 rounded-xl shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <CardContent className="p-6 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 border border-white/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Secure & Compliant
              </h3>
              <p className="text-gray-300">
                Bank-level security with SOC 2 compliance. Your investments and
                data are protected with enterprise-grade encryption.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border border-white/10 rounded-xl shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <CardContent className="p-6 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 border border-white/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Advanced Analytics
              </h3>
              <p className="text-gray-300">
                Comprehensive portfolio analytics with detailed performance
                metrics, risk assessment, and optimization suggestions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <div className="text-4xl font-bold text-blue-300 mb-2 relative z-10">
              $2.5B+
            </div>
            <div className="text-gray-300 relative z-10">
              Assets Under Management
            </div>
          </div>
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <div className="text-4xl font-bold text-blue-300 mb-2 relative z-10">
              50K+
            </div>
            <div className="text-gray-300 relative z-10">Active Investors</div>
          </div>
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <div className="text-4xl font-bold text-blue-300 mb-2 relative z-10">
              15.8%
            </div>
            <div className="text-gray-300 relative z-10">
              Average Annual Return
            </div>
          </div>
          <div className="bg-black/60 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
            {/* Mirror effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            <div className="text-4xl font-bold text-blue-300 mb-2 relative z-10">
              99.9%
            </div>
            <div className="text-gray-300 relative z-10">
              Uptime Reliability
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-black/60 border border-white/10 rounded-xl shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <CardContent className="p-12 text-center relative z-10">
            <h2 className="text-4xl font-bold text-white mb-4">
              Pronto para Começar Sua Jornada de Investimento?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de investidores que confiam no Build Strategy
              para seu futuro financeiro. Comece com apenas R$ 100 e veja sua
              riqueza crescer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {/* Mirror effect for button */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <span className="relative z-10">Criar Conta Gratuita</span>
                  <ArrowRight className="w-4 h-4 ml-2 relative z-10" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-200 backdrop-blur-[10px] relative overflow-hidden"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {/* Mirror effect for button */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none rounded-md"></div>
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <span className="relative z-10">Acessar Dashboard</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/60 backdrop-blur-[20px]">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Build Strategy
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-300">
              <span>© 2024 Build Strategy. Todos os direitos reservados.</span>
              <Link
                href="/login"
                className="hover:text-blue-300 transition-colors"
              >
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
