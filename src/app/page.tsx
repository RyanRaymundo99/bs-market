"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Shield,
  Coins,
  ArrowRight,
  UserPlus,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  MessageCircle,
  Calculator,
  ChevronDown,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CalculatorModal from "@/components/ui/calculator-modal";

const Home = () => {
  const { toast } = useToast();
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    const rejectionMessage = sessionStorage.getItem("rejectionMessage");
    if (rejectionMessage) {
      toast({
        title: "Conta Rejeitada",
        description: rejectionMessage,
        variant: "destructive",
      });
      sessionStorage.removeItem("rejectionMessage");
    }
  }, [toast]);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden home-bg">
      <div className="fixed inset-0 z-0" aria-hidden>
        <div className="home-bg-orb home-bg-orb-1" />
        <div className="home-bg-orb home-bg-orb-2" />
        <div className="home-bg-orb home-bg-orb-3" />
        <div className="home-bg-orb home-bg-orb-4" />
        <div className="home-bg-noise" />
        <div className="home-bg-glass-frost" />
      </div>
      <div className="home-bg-glass" aria-hidden />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-background/90 backdrop-blur-md">
          <nav className="container mx-auto px-4 md:px-8 lg:px-12 xl:px-16 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px]">
            <div className="flex items-center justify-between h-20 md:h-24 py-2 md:py-3">
              <Link href="/" className="flex items-center shrink-0" aria-label="Build Strategy - Início">
                <Image
                  src="/fullname-logo.svg"
                  alt="Build Strategy"
                  width={380}
                  height={22}
                  className="h-14 sm:h-16 md:h-20 lg:h-[88px] xl:h-[96px] w-auto object-contain"
                />
              </Link>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md h-7 px-2 md:px-3 text-[11px] font-medium"
                  >
                    Entrar
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-md h-7 px-2 md:px-3 text-[11px] shadow-sm"
                  >
                    Começar
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        </header>

        <main className="flex-1 flex flex-col min-h-0">
          {/* Hero — background image only in this section */}
          <section className="relative min-h-[85vh] flex flex-col justify-center">
            <div className="absolute inset-0 hero-bg-image" aria-hidden />
            <div className="container relative z-10 mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] pt-16 md:pt-24 lg:pt-28 pb-20 md:pb-28 lg:pb-32">
              <div className="max-w-2xl">
                <p className="text-primary text-sm font-medium uppercase tracking-widest mb-3">Compre e venda cripto</p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05]">
                  <span className="text-gradient">Build Strategy</span>
                </h1>
                <p className="mt-6 md:mt-8 text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Compre e venda criptomoedas em reais. Depósito via PIX, saque em até 24h e taxas competitivas.
                </p>
                <div className="mt-10 md:mt-12 flex flex-col sm:flex-row sm:items-center gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-12 px-6 lg:h-14 lg:px-8">
                      Criar conta grátis
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/login" className="flex items-center justify-center sm:justify-start text-muted-foreground hover:text-foreground text-sm transition-colors">
                    Já tem conta? <span className="ml-1 font-medium text-foreground">Entrar</span>
                  </Link>
                </div>
                <p className="mt-8 text-sm text-muted-foreground">
                  Depósito mínimo 100 USDT · Taxa até 3% · PIX na hora
                </p>
                <div className="flex flex-wrap gap-5 lg:gap-8 mt-8 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    Depósito PIX
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    Saque em BRL
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    2FA
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    Suporte em PT
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="como-funciona" className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-20 md:py-28 lg:py-32">
            <p className="landing-section-label">Como funciona</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mt-1 mb-3">
              Três passos para começar
            </h2>
            <p className="text-muted-foreground mb-12 lg:mb-16 max-w-xl text-base lg:text-lg leading-relaxed">
              Cadastre-se, deposite via PIX e negocie 24/7. Simples assim.
            </p>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-10 xl:gap-12">
              {[
                { icon: UserPlus, step: "1", title: "Cadastre-se", desc: "Crie sua conta em minutos. Grátis e sem compromisso." },
                { icon: CreditCard, step: "2", title: "Deposite via PIX", desc: "O valor cai na hora. Você começa a negociar na sequência." },
                { icon: TrendingUp, step: "3", title: "Negocie 24/7", desc: "Compre e venda cripto a qualquer momento. Saque em BRL quando quiser." },
              ].map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="landing-card p-6 md:p-8 lg:p-10">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Passo {step}</p>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Why us / Features */}
          <section id="por-que" className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-20 md:py-28 lg:py-32">
            <p className="landing-section-label">Por que a Build Strategy</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mt-1 mb-3">
              Exchange pensada para você
            </h2>
            <p className="text-muted-foreground mb-12 lg:mb-16 max-w-xl text-base lg:text-lg leading-relaxed">
              Liquidez, segurança e suporte em reais.
            </p>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-10 xl:gap-12">
              {[
                { icon: Zap, title: "Negocie 24/7", desc: "Mercado aberto o tempo todo. Ordens rápidas e saque em BRL em até 24h." },
                { icon: Shield, title: "Seguro e regulado", desc: "2FA, cold storage e criptografia. Seus ativos e dados protegidos." },
                { icon: Coins, title: "Pares em BRL", desc: "Compre e venda em reais. Taxas competitivas e depósito via PIX." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="landing-card p-6 lg:p-8">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-20 md:py-28 lg:py-32">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
              {[
                { value: "1.5M", label: "Volume negociado" },
                { value: "2K", label: "Traders ativos" },
                { value: "< 24h", label: "Saque em BRL" },
                { value: "99,9%", label: "Uptime" },
              ].map(({ value, label }) => (
                <div key={label} className="landing-card p-6 lg:p-8 text-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">{value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Use cases */}
          <section id="para-quem" className="relative py-20 md:py-28 lg:py-32">
            <div className="absolute inset-0 para-quem-bg-image" aria-hidden />
            <div className="container relative z-10 mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px]">
              <p className="landing-section-label">Para quem é</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mt-1 mb-3">
                Do primeiro real ao trading ativo
              </h2>
              <p className="text-muted-foreground mb-12 lg:mb-16 max-w-xl text-base lg:text-lg leading-relaxed">
                Seja sua primeira compra em cripto ou seu dia a dia de trading.
              </p>
              <div className="grid md:grid-cols-3 gap-8 lg:gap-10 xl:gap-12">
                <div className="landing-card p-6 lg:p-8 flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Primeiro USDT</h3>
                  <p className="text-muted-foreground text-sm flex-1">Comece com pouco. Compre USDT em reais, sem pressa.</p>
                  <Link href="/signup" className="mt-4 text-primary font-medium text-sm inline-flex items-center gap-1 hover:underline">
                    Abrir conta <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="landing-card p-6 lg:p-8 flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Trading ativo</h3>
                  <p className="text-muted-foreground text-sm flex-1">Ordens rápidas e liquidez. Para quem opera com frequência.</p>
                  <Link href="/trade" className="mt-4 text-primary font-medium text-sm inline-flex items-center gap-1 hover:underline">
                    Ir para Trade <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="landing-card p-6 lg:p-8 flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Saque em reais</h3>
                  <p className="text-muted-foreground text-sm flex-1">Converta em BRL e receba na conta em até 24h.</p>
                  <Link href="/withdraw" className="mt-4 text-primary font-medium text-sm inline-flex items-center gap-1 hover:underline">
                    Ver saques <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Comparison */}
          <section id="compare" className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-20 md:py-28 lg:py-32">
            <p className="landing-section-label">Compare</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mt-1 mb-2">
              Build Strategy vs outras exchanges
            </h2>
            <p className="text-muted-foreground mb-12 lg:mb-14 max-w-xl text-base lg:text-lg leading-relaxed">
              Taxas, saque em BRL e suporte em português.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card/80 backdrop-blur-xl">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-4 font-medium text-muted-foreground" />
                    <th className="p-4 font-semibold text-foreground bg-muted/50">Build Strategy</th>
                    <th className="p-4 font-medium text-muted-foreground">Outras</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["Taxa", "≤ 3%", "> 3%"],
                    ["Saque em BRL", "Até 24h", "Variável"],
                    ["Depósito PIX", "Na hora", "Na hora"],
                    ["Suporte em PT", "Sim", "Parcial ou não"],
                  ].map(([feature, us, others], i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-4 text-muted-foreground">{feature}</td>
                      <td className="p-4 text-primary font-medium">{us}</td>
                      <td className="p-4">{others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Testimonials */}
          <section id="depoimentos" className="relative py-20 md:py-28 lg:py-32">
            <div className="absolute inset-0 depoimentos-bg-image" aria-hidden />
            <div className="container relative z-10 mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px]">
              <p className="landing-section-label">Depoimentos</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mt-1 mb-3">
                O que nossos usuários dizem
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mt-10 lg:mt-12">
              {[
                { quote: "Consegui sacar em menos de 12h. Interface simples e suporte rápido.", name: "Ricardo M.", role: "Trader" },
                { quote: "Comecei a operar no mesmo dia que depositei via PIX. Zero burocracia.", name: "Ana S.", role: "Primeira compra em cripto" },
                { quote: "Taxas menores que as que eu pagava. Para quem opera todo dia faz diferença.", name: "Lucas F.", role: "Trader ativo" },
                { quote: "Suporte em português e resolução rápida. Recomendo para quem está começando.", name: "Marina C.", role: "Investidora" },
              ].map(({ quote, name, role }) => (
                <div key={name} className="landing-card p-6 lg:p-8">
                  <p className="text-muted-foreground text-sm leading-relaxed italic">&quot;{quote}&quot;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground text-sm font-medium">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{name}</p>
                      <p className="text-xs text-muted-foreground">{role}</p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </section>

          {/* Calculator + See platform */}
          <section className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-20 md:py-28 lg:py-32">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
              <div className="landing-card p-6 md:p-8">
                <Calculator className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Quanto vale em USDT?</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Simule em reais quanto você receberia em USDT antes de negociar.
                </p>
                <Button onClick={() => setCalculatorOpen(true)} variant="outline" className="border-border text-foreground hover:bg-muted rounded-xl">
                  Abrir calculadora <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              <div className="landing-card p-6 md:p-8">
                <Wallet className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Conheça a plataforma</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Interface simples para comprar, vender e acompanhar em reais.
                </p>
                <Link href="/trade">
                  <Button variant="outline" className="border-border text-foreground hover:bg-muted rounded-xl w-full sm:w-auto">
                    Ver área de trade <ExternalLink className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-20 md:py-28 lg:py-32">
            <p className="landing-section-label">Dúvidas</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mt-1 mb-3">
              Perguntas frequentes
            </h2>
            <p className="text-muted-foreground mb-10 lg:mb-12 max-w-xl text-base lg:text-lg leading-relaxed">
              Respostas rápidas para as dúvidas mais comuns.
            </p>
            <div className="max-w-2xl space-y-3">
              {[
                { q: "É seguro?", a: "Sim. Usamos 2FA, cold storage e criptografia de nível empresarial. Seus dados e fundos seguem os mesmos padrões de instituições financeiras." },
                { q: "Como funciona o saque em reais?", a: "Você solicita o saque na plataforma e o valor é enviado para sua conta em até 24 horas úteis. Sem taxa extra para saques em BRL." },
                { q: "Quanto tempo leva o PIX?", a: "O depósito via PIX é creditado na hora. Assim que o pagamento é confirmado, o valor já aparece para você negociar." },
                { q: "Tem app?", a: "A plataforma é responsiva e funciona no navegador do celular. Você acessa de qualquer dispositivo para negociar 24/7." },
                { q: "Qual o valor mínimo?", a: "O valor mínimo para depositar é 100 USDT. Para abrir conta não há custo." },
              ].map((item, i) => (
                <div key={i} className="landing-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left text-foreground font-medium hover:bg-muted/50 transition-colors rounded-2xl"
                  >
                    {item.q}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${faqOpen === i ? "rotate-180" : ""}`} />
                  </button>
                  {faqOpen === i && (
                    <div className="px-4 pb-4 text-muted-foreground text-sm border-t border-border pt-2 mx-4">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Support */}
          <section className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-20 md:py-28 lg:py-32">
            <div className="landing-card p-6 md:p-8 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Dúvidas? Fale com a gente</h3>
                  <p className="text-muted-foreground text-sm">Resposta em até 24h úteis. Suporte em português.</p>
                </div>
              </div>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867"}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="border-border text-foreground hover:bg-muted rounded-xl">
                  Acessar suporte
                </Button>
              </a>
            </div>
          </section>

          {/* CTA */}
          <section className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-20 md:py-28 lg:py-32">
            <div className="relative rounded-2xl border border-primary/30 overflow-hidden min-h-[380px] md:min-h-[340px]">
              <Image
                src="/imgs/gigi-PDHwGhByXOM-unsplash.jpg"
                alt="Negocie cripto em reais"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 1280px"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/50" />
              <div className="relative z-10 p-10 md:p-14 lg:p-16 flex flex-col justify-center max-w-2xl">
                <p className="text-primary text-sm font-medium mb-2">+ de 2.000 contas criadas este mês</p>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
                  Pronto para negociar cripto em reais?
                </h2>
                <p className="text-muted-foreground max-w-xl mb-8 leading-relaxed">
                  Deposite via PIX, negocie 24/7 e saque em BRL quando quiser. Primeiro saque em até 24h ou suporte prioritário.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-12 px-6">
                      Criar conta grátis
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-border text-foreground hover:bg-muted rounded-xl h-12">
                      Entrar
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <CalculatorModal isOpen={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

        <footer className="mt-auto border-t border-border bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] py-8 md:py-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <Link href="/" className="flex items-center">
                <Image src="/fullname-logo.svg" alt="Build Strategy" width={260} height={64} className="h-12 md:h-14 w-auto opacity-90" />
              </Link>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <Link href="/terms" className="hover:text-foreground transition-colors">Termos</Link>
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
                <Link href="/login" className="hover:text-primary transition-colors font-medium">Entrar</Link>
              </div>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              © {new Date().getFullYear()} Build Strategy. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;
