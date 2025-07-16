"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/ui/navbar";
import { ChevronDown, Copy, ExternalLink, AlertCircle } from "lucide-react";

export default function DepositarPage() {
  const [showModal, setShowModal] = useState(true);
  const [agreements, setAgreements] = useState({
    incorrectAddress: false,
    contractAddress: false,
    belowMinimum: false,
    wrongNetwork: false,
  });
  const [copied, setCopied] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const pixKey = "pix@brasilbitcoin.com.br";

  // Check if user has already agreed to terms
  useEffect(() => {
    const hasAgreed = localStorage.getItem("deposit-terms-agreed");
    if (hasAgreed === "true") {
      setShowModal(false);
    }
  }, []);

  const handleAgreementChange = (key: keyof typeof agreements) => {
    setAgreements((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allAgreementsChecked = Object.values(agreements).every(
    (agreement) => agreement
  );

  const handleProceed = () => {
    if (allAgreementsChecked) {
      localStorage.setItem("deposit-terms-agreed", "true");
      setShowModal(false);
    }
  };

  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Universal Navbar */}
      <Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Depositar</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Deposit Form */}
          <div className="bg-card rounded-lg p-6">
            {/* Balance Information */}
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground mb-1">
                  Saldo disponível
                </h3>
                <div className="text-2xl font-bold">R$ 0,00</div>
              </div>
              <div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Saldo em uso
                </h3>
                <div className="text-2xl font-bold">R$ 0,00</div>
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-6">
              <h3 className="text-sm text-muted-foreground mb-2">
                Moeda selecionada
              </h3>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R$</span>
                </div>
                <span className="font-semibold">Reais BRL</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </div>
            </div>

            {/* Type Selection */}
            <div className="mb-6">
              <h3 className="text-sm text-muted-foreground mb-2">Tipo</h3>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">P</span>
                </div>
                <span className="font-semibold">Pix</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </div>
            </div>

            {/* QR Code */}
            <div className="mb-6">
              <div className="w-48 h-48 bg-white rounded-lg border border-border flex items-center justify-center mx-auto relative">
                {/* Placeholder QR Code */}
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                    <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">P</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">QR Code</div>
                </div>
              </div>
            </div>

            {/* Pix Key */}
            <div className="mb-6">
              <h3 className="text-sm text-muted-foreground mb-2">Chave Pix</h3>
              <div className="p-3 bg-muted rounded-lg border border-border mb-3">
                <span className="font-mono text-sm">{pixKey}</span>
              </div>
              <Button
                onClick={handleCopyPixKey}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>

          {/* Right Panel - Instructions */}
          <div className="bg-card rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Orientações</h2>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Faça transferências apenas de contas de mesma titularidade da
                  sua conta Build Strategy.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Só são aceitos depósitos provenientes de contas de mesma
                  titularidade.{" "}
                  <span className="text-primary font-semibold">
                    Depósitos de terceiros não são aceitos em nenhuma ocasião
                  </span>
                  , ainda que tenham como origem uma conta jurídica relacionada
                  a você.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Depósitos via PIX podem demorar até cinco minutos para serem
                  creditados, enquanto depósitos via TED podem ser creditados em
                  até duas horas úteis. Confira todos os prazos{" "}
                  <a href="#" className="text-primary hover:underline">
                    aqui
                  </a>
                  .
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  No momento, só é possível depositar por transferência
                  eletrônica (PIX ou TED). Não aceitamos depósitos por boleto,
                  cartão e outros métodos alternativos.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm">
                  Caso você deposite um valor que exceda o seu limite de
                  depósito, a quantia ficará retida até que seja realizada a
                  verificação da conta.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <a
                href="#"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <span className="font-semibold">
                  FAQ (Perguntas Frequentes)
                </span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Terms Agreement Modal */}
      <Dialog open={showModal} onOpenChange={() => {}}>
        <DialogContent className="bg-card border border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Ao tocar em prosseguir, concordo que:
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="incorrect-address"
                  checked={agreements.incorrectAddress}
                  onCheckedChange={() =>
                    handleAgreementChange("incorrectAddress")
                  }
                />
                <label
                  htmlFor="incorrect-address"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  Depositar no endereço de depósito incorreto ou sem tag
                  ocasionará a perda dos fundos;
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="contract-address"
                  checked={agreements.contractAddress}
                  onCheckedChange={() =>
                    handleAgreementChange("contractAddress")
                  }
                />
                <label
                  htmlFor="contract-address"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  Depositar no endereço de contrato da moeda ocasionará a perda
                  dos fundos;
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="below-minimum"
                  checked={agreements.belowMinimum}
                  onCheckedChange={() => handleAgreementChange("belowMinimum")}
                />
                <label
                  htmlFor="below-minimum"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  Depositar quantia abaixo do valor mínimo ocasionará a perda
                  dos fundos;
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="wrong-network"
                  checked={agreements.wrongNetwork}
                  onCheckedChange={() => handleAgreementChange("wrongNetwork")}
                />
                <label
                  htmlFor="wrong-network"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  Depositar quantia para a rede incorreta ocasionará a perda dos
                  fundos;
                </label>
              </div>
            </div>

            <Button
              className="w-full bg-muted hover:bg-muted/80 text-foreground"
              disabled={!allAgreementsChecked}
              onClick={handleProceed}
            >
              Prosseguir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
