import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold">Termos de Serviço</h1>
        </div>

        {/* Content */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-[20px] relative overflow-hidden">
          {/* Mirror effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          <div className="relative z-10 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">
                1. Aceitação dos Termos
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Ao acessar e usar este serviço, você concorda em cumprir e estar
                vinculado a estes termos de serviço.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Uso do Serviço</h2>
              <p className="text-gray-300 leading-relaxed">
                Você concorda em usar o serviço apenas para propósitos legais e
                de acordo com estes termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. Privacidade</h2>
              <p className="text-gray-300 leading-relaxed">
                Sua privacidade é importante para nós. Consulte nossa Política
                de Privacidade para entender como coletamos e usamos suas
                informações.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">
                4. Responsabilidades
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Você é responsável por manter a confidencialidade de sua conta e
                senha.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. Modificações</h2>
              <p className="text-gray-300 leading-relaxed">
                Reservamo-nos o direito de modificar estes termos a qualquer
                momento. As modificações entrarão em vigor imediatamente após a
                publicação.
              </p>
            </section>

            <div className="pt-6 border-t border-white/10">
              <p className="text-sm text-gray-400">
                Última atualização: {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
