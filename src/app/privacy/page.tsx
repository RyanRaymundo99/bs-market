import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Política de Privacidade</h1>
        </div>

        {/* Content */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <div className="relative z-10 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Informações Coletadas</h2>
              <p className="text-gray-300 leading-relaxed">
                Coletamos informações que você nos fornece diretamente, como nome, email e outras informações de contato quando você se registra ou usa nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Como Usamos Suas Informações</h2>
              <p className="text-gray-300 leading-relaxed">
                Usamos suas informações para fornecer, manter e melhorar nossos serviços, processar transações e comunicar com você.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. Compartilhamento de Informações</h2>
              <p className="text-gray-300 leading-relaxed">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto conforme descrito nesta política.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">4. Segurança</h2>
              <p className="text-gray-300 leading-relaxed">
                Implementamos medidas de segurança apropriadas para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. Cookies e Tecnologias Similares</h2>
              <p className="text-gray-300 leading-relaxed">
                Usamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso do site e personalizar conteúdo.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">6. Seus Direitos</h2>
              <p className="text-gray-300 leading-relaxed">
                Você tem o direito de acessar, corrigir ou excluir suas informações pessoais. Entre em contato conosco para exercer esses direitos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">7. Alterações na Política</h2>
              <p className="text-gray-300 leading-relaxed">
                Podemos atualizar esta política de privacidade periodicamente. Notificaremos você sobre mudanças significativas.
              </p>
            </section>

            <div className="pt-6 border-t border-white/10">
              <p className="text-sm text-gray-400">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 