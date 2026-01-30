"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "pt" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

// Comprehensive translations for the entire app
const translations = {
  pt: {
    // Navigation
    dashboard: "Dashboard",
    trade: "Depositar",
    withdraw: "Sacar",
    profile: "Perfil",
    logout: "Sair",
    loggingOut: "Saindo...",
    menu: "Menu",

    // Dashboard
    buyUSDT: "Depositar USDT",
    withdrawFunds: "Sacar",
    totalTransactions: "Total Transações",
    successRate: "Taxa Sucesso",
    lastDeposit: "Último Depósito",
    recentActivity: "Atividade Recente",
    balance: "Saldo",
    totalBalance: "Saldo Total",
    balanceEvolution: "Evolução do Saldo",
    seeAll: "Ver todas",
    buyUSDTTransaction: "Compra USDT",
    deposit: "Depósito",
    withdrawal: "Saque",
    sell: "Venda",
    makeFirstPurchase: "Fazer primeira compra",

    // Trade
    buyUSDTViaPIX: "Depositar USDT via PIX",
    enterAmount: "Digite o valor em BRL",
    fee: "Taxa de 3% sobre o valor",
    confirmPurchase: "Confirmar Compra",
    purchaseHistory: "Histórico de Compras",
    noPurchases: "Nenhuma compra realizada ainda",
    purchasesWillAppear: "Suas compras aparecerão aqui",
    amountPaid: "Valor pago",
    received: "Recebido",
    completed: "Concluída",
    pending: "Pendente",
    failed: "Falhou",

    // PIX Modal
    scanQRCode: "Escaneie o QR Code",
    pixCode: "Código PIX (Copia e Cola)",
    codeCopied: "Código copiado!",
    pixCodeNotAvailable:
      "Código PIX não disponível. Use o QR Code acima para escanear.",
    paymentInstructions:
      "Após o pagamento, seus USDT serão creditados automaticamente via webhook.",
    clickToSeeQRCode: "Clique para ver QR Code",

    // Withdraw
    withdrawUSDT: "Sacar USDT",
    enterUSDTAmount: "Digite o valor em USDT",
    walletAddress: "Endereço da Carteira",
    selectNetwork: "Selecione a Rede",
    network: "Rede",
    feeAmount: "Taxa",
    youWillReceive: "Você receberá",
    confirmWithdrawal: "Confirmar Saque",
    withdrawalHistory: "Histórico de Saques",
    noWithdrawals: "Nenhum saque realizado ainda",
    withdrawalsWillAppear: "Seus saques aparecerão aqui",
    invalidAmount: "Valor Inválido",
    enterValidUSDT: "Por favor, insira um valor válido em USDT",
    addressRequired: "Endereço Obrigatório",
    withdrawalError: "Erro no Saque",
    failedToProcess: "Falha ao processar saque USDT",
    transactionSent:
      "Transação enviada para processamento. Aguarde a confirmação na blockchain.",
    chooseWithdrawalMethod: "Escolha o método de saque e retire seus fundos",
    withdrawViaUSDT: "Saque via USDT",
    sendUSDTToWallet: "Envie USDT para sua carteira externa",
    availableBalance: "Saldo disponível:",
    amountToWithdraw: "Valor a sacar (USDT)",
    enterWalletAddress: "Digite o endereço da carteira",
    networkFee: "Taxa de rede:",
    netTotal: "Total líquido:",
    sendUSDT: "Enviar USDT",
    processing: "Processando...",
    portfolioSummary: "Resumo do Portfólio",
    totalPortfolioValue: "Valor Total do Portfólio",
    lastUpdated: "Última Atualização",
    withdrawalHistoryDescription: "Histórico completo de saques realizados",
    date: "Data",
    type: "Tipo",
    value: "Valor",
    status: "Status",
    hashProtocol: "Hash/Protocolo",
    unknown: "Desconhecido",
    processingStatus: "Processando",
    completedStatus: "Concluído",
    rejectedStatus: "Rejeitado",
    trc20Option: "TRC20 (Tron) - Taxa menor",
    erc20Option: "ERC20 (Ethereum) - Taxa maior",
    noWithdrawalHistory:
      "Nenhum histórico de saque encontrado. Realize seu primeiro saque para ver o histórico aqui.",
    withdrawalProcessed: "Saque Processado",
    close: "Fechar",

    // Profile
    profileManagement: "Gerenciamento de Perfil",
    manageInfo: "Gerencie suas informações pessoais e documentos KYC",
    personalInformation: "Informações Pessoais",
    fullName: "Nome Completo",
    email: "Email",
    phone: "Telefone",
    cpf: "CPF",
    notProvided: "Não informado",
    editProfile: "Editar Perfil",
    save: "Salvar",
    cancel: "Cancelar",
    accountStatus: "Status da Conta",
    accountApproval: "Aprovação da Conta",
    kycStatus: "Status KYC",
    approved: "Aprovado",
    rejected: "Rejeitado",
    kycDocuments: "Documentos KYC",
    documentFront: "Frente do Documento",
    documentBack: "Verso do Documento",
    selfieWithDocument: "Selfie com Documento",
    noDocumentUploaded: "Nenhum documento enviado",
    noSelfieUploaded: "Nenhuma selfie enviada",
    uploadFront: "Enviar Frente",
    uploadBack: "Enviar Verso",
    uploadSelfie: "Enviar Selfie",
    uploaded: "Enviado",
    submitted: "Enviado",
    reviewed: "Revisado",
    kycRejectionReason: "Motivo da Rejeição KYC",
    profileUpdated: "Perfil Atualizado",
    profileUpdatedSuccess: "Seu perfil foi atualizado com sucesso",
    error: "Erro",
    failedToLoadProfile: "Falha ao carregar informações do perfil",
    failedToUpdateProfile: "Falha ao atualizar perfil",
    documentUploaded: "Documento Enviado",
    documentUploadedSuccess: "Seu documento foi enviado com sucesso",
    uploadFailed: "Falha no Envio",
    failedToUpload: "Falha ao enviar documento",
    preview: "Pré-visualização",
    uploading: "Enviando...",
    uploadDocument: "Enviar Documento",
    loadingProfile: "Carregando perfil...",
    quotesUpdated: "As cotações são atualizadas em tempo real",
    feeApplied: "Taxa de 3% aplicada em todas as operações",
    pixPayment: "Pagamento via PIX com confirmação automática",
    contactSupport: "Fale com o Suporte",
    contactSupportDescription:
      "Dúvidas ou problemas? Entre em contato pelo WhatsApp ou e-mail.",
    contactViaWhatsApp: "WhatsApp",
    contactViaEmail: "E-mail",
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    trade: "Trade",
    withdraw: "Withdraw",
    profile: "Profile",
    logout: "Logout",
    loggingOut: "Logging out...",
    menu: "Menu",

    // Dashboard
    buyUSDT: "Buy USDT",
    withdrawFunds: "Withdraw",
    totalTransactions: "Total Transactions",
    successRate: "Success Rate",
    lastDeposit: "Last Deposit",
    recentActivity: "Recent Activity",
    balance: "Balance",
    totalBalance: "Total Balance",
    balanceEvolution: "Balance Evolution",
    seeAll: "See all",
    buyUSDTTransaction: "Buy USDT",
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    sell: "Sell",
    makeFirstPurchase: "Make first purchase",

    // Trade
    buyUSDTViaPIX: "Buy USDT via PIX",
    enterAmount: "Enter amount in BRL",
    fee: "3% fee on amount",
    confirmPurchase: "Confirm Purchase",
    purchaseHistory: "Purchase History",
    noPurchases: "No purchases made yet",
    purchasesWillAppear: "Your purchases will appear here",
    amountPaid: "Amount paid",
    received: "Received",
    completed: "Completed",
    pending: "Pending",
    failed: "Failed",

    // PIX Modal
    scanQRCode: "Scan QR Code",
    pixCode: "PIX Code (Copy and Paste)",
    codeCopied: "Code copied!",
    pixCodeNotAvailable:
      "PIX code not available. Use the QR Code above to scan.",
    paymentInstructions:
      "After payment, your USDT will be credited automatically via webhook.",
    clickToSeeQRCode: "Click to see QR Code",

    // Withdraw
    withdrawUSDT: "Withdraw USDT",
    enterUSDTAmount: "Enter amount in USDT",
    walletAddress: "Wallet Address",
    selectNetwork: "Select Network",
    network: "Network",
    feeAmount: "Fee",
    youWillReceive: "You will receive",
    confirmWithdrawal: "Confirm Withdrawal",
    withdrawalHistory: "Withdrawal History",
    noWithdrawals: "No withdrawals made yet",
    withdrawalsWillAppear: "Your withdrawals will appear here",
    invalidAmount: "Invalid Amount",
    enterValidUSDT: "Please enter a valid USDT amount",
    addressRequired: "Address Required",
    withdrawalError: "Withdrawal Error",
    failedToProcess: "Failed to process USDT withdrawal",
    transactionSent:
      "Transaction sent for processing. Wait for blockchain confirmation.",
    chooseWithdrawalMethod: "Choose withdrawal method and withdraw your funds",
    withdrawViaUSDT: "Withdraw via USDT",
    sendUSDTToWallet: "Send USDT to your external wallet",
    availableBalance: "Available Balance:",
    amountToWithdraw: "Amount to withdraw (USDT)",
    enterWalletAddress: "Enter wallet address",
    networkFee: "Network Fee:",
    netTotal: "Net Total:",
    sendUSDT: "Send USDT",
    processing: "Processing...",
    portfolioSummary: "Portfolio Summary",
    totalPortfolioValue: "Total Portfolio Value",
    lastUpdated: "Last Updated",
    withdrawalHistoryDescription: "Complete withdrawal history",
    date: "Date",
    type: "Type",
    value: "Value",
    status: "Status",
    hashProtocol: "Hash/Protocol",
    unknown: "Unknown",
    processingStatus: "Processing",
    completedStatus: "Completed",
    rejectedStatus: "Rejected",
    trc20Option: "TRC20 (Tron) - Lower fee",
    erc20Option: "ERC20 (Ethereum) - Higher fee",
    noWithdrawalHistory:
      "No withdrawal history found. Make your first withdrawal to see history here.",
    withdrawalProcessed: "Withdrawal Processed",
    close: "Close",

    // Profile
    profileManagement: "Profile Management",
    manageInfo: "Manage your personal information and KYC documents",
    personalInformation: "Personal Information",
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    cpf: "CPF",
    notProvided: "Not provided",
    editProfile: "Edit Profile",
    save: "Save",
    cancel: "Cancel",
    accountStatus: "Account Status",
    accountApproval: "Account Approval",
    kycStatus: "KYC Status",
    approved: "Approved",
    rejected: "Rejected",
    kycDocuments: "KYC Documents",
    documentFront: "Document Front",
    documentBack: "Document Back",
    selfieWithDocument: "Selfie with Document",
    noDocumentUploaded: "No document uploaded",
    noSelfieUploaded: "No selfie uploaded",
    uploadFront: "Upload Front",
    uploadBack: "Upload Back",
    uploadSelfie: "Upload Selfie",
    uploaded: "Uploaded",
    submitted: "Submitted",
    reviewed: "Reviewed",
    kycRejectionReason: "KYC Rejection Reason",
    profileUpdated: "Profile Updated",
    profileUpdatedSuccess: "Your profile has been updated successfully",
    error: "Error",
    failedToLoadProfile: "Failed to load profile information",
    failedToUpdateProfile: "Failed to update profile",
    documentUploaded: "Document Uploaded",
    documentUploadedSuccess: "Your document has been uploaded successfully",
    uploadFailed: "Upload Failed",
    failedToUpload: "Failed to upload document",
    preview: "Preview",
    uploading: "Uploading...",
    uploadDocument: "Upload Document",
    loadingProfile: "Loading profile...",
    quotesUpdated: "Quotes are updated in real time",
    feeApplied: "3% fee applied to all operations",
    pixPayment: "PIX payment with automatic confirmation",
    contactSupport: "Contact Support",
    contactSupportDescription:
      "Questions or issues? Reach us via WhatsApp or email.",
    contactViaWhatsApp: "WhatsApp",
    contactViaEmail: "Email",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always initialize to "pt" to prevent hydration mismatch
  // We'll read from localStorage in useEffect after mount
  const [language, setLanguageState] = useState<Language>("pt");

  // Read from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language") as Language;
      if (saved === "en" || saved === "pt") {
        setLanguageState(saved);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("language", language);
      document.documentElement.lang = language === "pt" ? "pt-BR" : "en-US";
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.pt] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
