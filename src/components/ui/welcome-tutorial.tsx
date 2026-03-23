"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Wallet,
  TrendingUp,
  Shield,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const STEP_COUNT = 4;

interface WelcomeTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export function WelcomeTutorial({
  isOpen,
  onClose,
  userName,
}: WelcomeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Sparkles,
      title: "Bem-vindo ao BS Market",
      subtitle: `Olá${userName ? `, ${userName}` : ""}! Sua conta foi criada.`,
      body: "Você já pode acessar o dashboard. Complete o perfil quando quiser para liberar depósitos e saques.",
      accent: "from-emerald-500/20 to-cyan-500/10",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      icon: FileCheck,
      title: "Complete seu perfil",
      subtitle: "Verificação de identidade (KYC)",
      body: "Envie seus documentos no menu Perfil para habilitar PIX, saques e operações completas. Você pode fazer isso a qualquer momento.",
      accent: "from-blue-500/20 to-indigo-500/10",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      icon: Wallet,
      title: "Adicione saldo",
      subtitle: "PIX e criptomoedas",
      body: "Deposite via PIX (instantâneo) ou receba criptomoedas. Seu saldo aparece no dashboard e pode ser usado para comprar USDT e outras moedas.",
      accent: "from-violet-500/20 to-purple-500/10",
      iconBg: "bg-violet-500/20",
      iconColor: "text-violet-400",
    },
    {
      icon: TrendingUp,
      title: "Compre e venda cripto",
      subtitle: "USDT",
      body: "Negocie com preços em tempo real, acompanhe seu portfólio e histórico de transações. Tudo no mesmo lugar.",
      accent: "from-amber-500/20 to-orange-500/10",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
    },
  ];

  const finalStep = {
    icon: Shield,
    title: "Pronto para começar",
    subtitle: "Sua conta está ativa",
    body: "Acesse o dashboard e explore. Se tiver dúvidas, use o menu e o suporte quando precisar.",
    accent: "from-emerald-500/20 to-teal-500/10",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  };

  const isLastStep = currentStep === STEP_COUNT;
  const displayStep = currentStep < STEP_COUNT ? steps[currentStep] : finalStep;
  const IconComponent = displayStep.icon;

  const goNext = () => {
    if (currentStep < STEP_COUNT) setCurrentStep((s) => s + 1);
    else onClose();
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden text-white"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={onClose}
      >
        {/* Top gradient bar */}
        <div
          className={`h-1 w-full bg-gradient-to-r ${displayStep.accent}`}
          aria-hidden
        />

        <div className="p-6 sm:p-8">
          {/* Step indicator dots */}
          <div className="flex justify-center gap-2 mb-6" role="tablist" aria-label="Passos do tutorial">
            {Array.from({ length: STEP_COUNT + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-6 bg-[#12E0A1]"
                    : i < currentStep
                    ? "w-2 bg-[#12E0A1]/60"
                    : "w-2 bg-white/20"
                }`}
                aria-label={`Ir para o passo ${i + 1}`}
                aria-selected={i === currentStep}
                role="tab"
              />
            ))}
          </div>

          {/* Content */}
          <div
            className="min-h-[200px] flex flex-col items-center text-center"
            role="tabpanel"
            aria-live="polite"
          >
            <div
              className={`rounded-2xl p-4 mb-5 ${displayStep.iconBg} ${displayStep.iconColor}`}
            >
              <IconComponent className="h-10 w-10" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">
              {displayStep.title}
            </h2>
            <p className="text-sm text-white/70 mb-4">{displayStep.subtitle}</p>
            <p className="text-sm text-white/80 leading-relaxed max-w-sm">
              {displayStep.body}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              {currentStep > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white/60 hover:text-white/90 hover:bg-white/10"
                >
                  Pular
                </Button>
              )}
            </div>
            <Button
              type="button"
              onClick={goNext}
              className="bg-[#12E0A1] hover:bg-[#12E0A1]/90 text-black font-medium shadow-lg shadow-[#12E0A1]/20"
            >
              {isLastStep ? (
                <>
                  Ir ao dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
