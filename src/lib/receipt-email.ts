"use server";
import { sendEmail } from "./email";

interface PurchaseReceiptData {
  userName: string;
  userEmail: string;
  amountBRL: number;
  amountUSDT: number;
  exchangeRate: number;
  fee: number;
  totalPaid: number;
  transactionId: string;
  date: Date;
  paymentMethod: string;
}

interface WithdrawalReceiptData {
  userName: string;
  userEmail: string;
  amount: number;
  networkFee: number;
  netAmount: number;
  network: string;
  walletAddress: string;
  transactionHash?: string;
  transactionId?: string;
  date: Date;
  status: string;
}

export async function sendPurchaseReceipt(data: PurchaseReceiptData) {
  try {
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data.date);

    const subject = `BS Market - Recibo de Compra #${data.transactionId.slice(
      0,
      8
    )}`;

    const text = `
Olá ${data.userName},

Sua compra foi processada com sucesso!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DETALHES DA COMPRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID da Transação: ${data.transactionId}
Data: ${formattedDate}
Método de Pagamento: ${data.paymentMethod}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 VALORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Valor em BRL: R$ ${data.amountBRL.toFixed(2)}
Taxa (3%): R$ ${data.fee.toFixed(2)}
Total Pago: R$ ${data.totalPaid.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🪙 CRIPTOMOEDA RECEBIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quantidade: ${data.amountUSDT.toFixed(4)} USDT
Taxa de Câmbio: R$ ${data.exchangeRate.toFixed(2)} por USDT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seus USDT foram creditados na sua conta e já estão disponíveis para uso.

Se você tiver alguma dúvida, entre em contato com nosso suporte.

Atenciosamente,
Equipe BS Market
`;

    const result = await sendEmail({
      to: data.userEmail,
      subject,
      text,
    });

    if (result.success) {
      console.log(`✅ Purchase receipt sent to ${data.userEmail}`);
    } else {
      console.error(`❌ Failed to send purchase receipt: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error("Error sending purchase receipt:", error);
    return { success: false, message: "Failed to send receipt email" };
  }
}

interface PIXWithdrawalReceiptData {
  userName: string;
  userEmail: string;
  amount: number;
  fee: number;
  netAmount: number;
  pixKey: string;
  protocol: string;
  date: Date;
  status: string;
}

export async function sendPIXWithdrawalReceipt(data: PIXWithdrawalReceiptData) {
  try {
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data.date);

    const statusText =
      data.status === "COMPLETED"
        ? "Concluído"
        : data.status === "PENDING"
        ? "Pendente"
        : data.status === "PROCESSING"
        ? "Processando"
        : "Falhou";

    const subject = `BS Market - Recibo de Saque PIX #${data.protocol}`;

    const text = `
Olá ${data.userName},

Seu saque PIX foi ${
      data.status === "COMPLETED" ? "processado com sucesso" : "solicitado"
    }!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DETALHES DO SAQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Protocolo: ${data.protocol}
Data: ${formattedDate}
Status: ${statusText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 VALORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Valor Solicitado: R$ ${data.amount.toFixed(2)}
Taxa (3%): R$ ${data.fee.toFixed(2)}
Valor Líquido Recebido: R$ ${data.netAmount.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 DESTINO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chave PIX: ${data.pixKey}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${
  data.status === "COMPLETED"
    ? "Seu saque PIX foi processado e o valor foi enviado para a chave PIX informada."
    : data.status === "PENDING"
    ? "Seu saque PIX está aguardando processamento. Você receberá uma notificação quando for concluído."
    : "Seu saque PIX está sendo processado. Você receberá uma notificação quando for concluído."
}

Se você tiver alguma dúvida, entre em contato com nosso suporte.

Atenciosamente,
Equipe BS Market
`;

    const result = await sendEmail({
      to: data.userEmail,
      subject,
      text,
    });

    if (result.success) {
      console.log(`✅ PIX withdrawal receipt sent to ${data.userEmail}`);
    } else {
      console.error(
        `❌ Failed to send PIX withdrawal receipt: ${result.message}`
      );
    }

    return result;
  } catch (error) {
    console.error("Error sending PIX withdrawal receipt:", error);
    return { success: false, message: "Failed to send receipt email" };
  }
}

export async function sendWithdrawalReceipt(data: WithdrawalReceiptData) {
  try {
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data.date);

    const statusText =
      data.status === "COMPLETED"
        ? "Concluído"
        : data.status === "PENDING"
        ? "Pendente"
        : data.status === "PROCESSING"
        ? "Processando"
        : "Falhou";

    const subject = `BS Market - Recibo de Saque #${
      data.transactionId?.slice(0, 8) || "N/A"
    }`;

    const text = `
Olá ${data.userName},

Seu saque foi ${
      data.status === "COMPLETED" ? "processado com sucesso" : "solicitado"
    }!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DETALHES DO SAQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.transactionId ? `ID da Transação: ${data.transactionId}` : ""}
Data: ${formattedDate}
Status: ${statusText}
Rede: ${data.network}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 VALORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Valor Solicitado: ${data.amount.toFixed(4)} USDT
Taxa de Rede (${data.network}): ${data.networkFee.toFixed(4)} USDT
Valor Líquido Recebido: ${data.netAmount.toFixed(4)} USDT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 DESTINO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Endereço da Carteira: ${data.walletAddress}
${data.transactionHash ? `Hash da Transação: ${data.transactionHash}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${
  data.status === "COMPLETED"
    ? "Seus USDT foram enviados para o endereço informado. A transação pode levar alguns minutos para aparecer na blockchain."
    : data.status === "PENDING"
    ? "Seu saque está aguardando processamento. Você receberá uma notificação quando for concluído."
    : "Seu saque está sendo processado. Você receberá uma notificação quando for concluído."
}

Se você tiver alguma dúvida, entre em contato com nosso suporte.

Atenciosamente,
Equipe BS Market
`;

    const result = await sendEmail({
      to: data.userEmail,
      subject,
      text,
    });

    if (result.success) {
      console.log(`✅ Withdrawal receipt sent to ${data.userEmail}`);
    } else {
      console.error(`❌ Failed to send withdrawal receipt: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error("Error sending withdrawal receipt:", error);
    return { success: false, message: "Failed to send receipt email" };
  }
}
