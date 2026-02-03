"use server";
import { sendEmail } from "./email";
import { logSentEmailByEmail } from "./communication-log";

// Helper function to generate bank-style HTML receipt template
function generateBankReceiptHTML({
  title,
  transactionId,
  date,
  userName,
  items,
  footerMessage,
  status = "CONCLUÍDO",
}: {
  title: string;
  transactionId: string;
  date: string;
  userName: string;
  items: Array<{ label: string; value: string; highlight?: boolean }>;
  footerMessage: string;
  status?: string;
}) {
  const statusColor =
    status === "CONCLUÍDO"
      ? "#10B981"
      : status === "PENDENTE"
      ? "#F59E0B"
      : status === "PROCESSANDO"
      ? "#3B82F6"
      : "#EF4444";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      <span style="font-size: 28px; color: #1e40af;">💳</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">BS MARKET</h1>
                    <p style="color: #e0e7ff; margin: 5px 0 0; font-size: 14px; font-weight: 300;">Comprovante de Transação</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td style="padding: 20px 40px 0; text-align: center;">
              <span style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${status}
              </span>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td style="padding: 25px 40px 15px; text-align: center;">
              <h2 style="color: #1f2937; margin: 0; font-size: 20px; font-weight: 600;">${title}</h2>
            </td>
          </tr>
          
          <!-- Transaction Info -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">ID da Transação</td>
                      </tr>
                      <tr>
                        <td style="color: #1f2937; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">${transactionId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">Data e Hora</td>
                      </tr>
                      <tr>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 500;">${date}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">Beneficiário</td>
                      </tr>
                      <tr>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 500;">${userName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Details Section -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${items
                    .map(
                      (item, index) => `
                  <tr>
                    <td style="padding: ${index === 0 ? "20px" : "16px"} 20px ${
                        index === items.length - 1 ? "20px" : "0"
                      }; ${
                        index !== items.length - 1
                          ? "border-bottom: 1px solid #e5e7eb;"
                          : ""
                      }">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color: #6b7280; font-size: 13px; font-weight: 500; width: 50%;">${
                            item.label
                          }</td>
                          <td align="right" style="color: ${
                            item.highlight ? "#1e40af" : "#1f2937"
                          }; font-size: ${
                        item.highlight ? "18px" : "14px"
                      }; font-weight: ${item.highlight ? "700" : "600"};">
                            ${item.value}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  `
                    )
                    .join("")}
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer Message -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 4px;">
                <p style="color: #1e40af; margin: 0; font-size: 13px; line-height: 1.6;">
                  ${footerMessage}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 10px; font-size: 12px;">
                Este é um comprovante automático. Por favor, guarde este e-mail para seus registros.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 11px;">
                BS Market - www.bsmarket.com.br<br>
                Em caso de dúvidas, entre em contato com nosso suporte.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

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

    const subject = `BS Market - Comprovante de Compra #${data.transactionId.slice(
      0,
      8
    )}`;

    const text = `
Comprovante de Compra - BS Market

ID da Transação: ${data.transactionId}
Data: ${formattedDate}
Beneficiário: ${data.userName}

Valor em BRL: R$ ${data.amountBRL.toFixed(2)}
Taxa (3%): R$ ${data.fee.toFixed(2)}
Total Pago: R$ ${data.totalPaid.toFixed(2)}

Quantidade Recebida: ${data.amountUSDT.toFixed(4)} USDT
Taxa de Câmbio: R$ ${data.exchangeRate.toFixed(2)} por USDT

Seus USDT foram creditados na sua conta e já estão disponíveis para uso.
`;

    const html = generateBankReceiptHTML({
      title: "Comprovante de Compra",
      transactionId: data.transactionId,
      date: formattedDate,
      userName: data.userName,
      items: [
        {
          label: "Método de Pagamento",
          value: data.paymentMethod,
        },
        {
          label: "Valor em BRL",
          value: `R$ ${data.amountBRL.toFixed(2)}`,
        },
        {
          label: "Taxa (3%)",
          value: `R$ ${data.fee.toFixed(2)}`,
        },
        {
          label: "Total Pago",
          value: `R$ ${data.totalPaid.toFixed(2)}`,
          highlight: true,
        },
        {
          label: "Quantidade Recebida",
          value: `${data.amountUSDT.toFixed(4)} USDT`,
          highlight: true,
        },
        {
          label: "Taxa de Câmbio",
          value: `R$ ${data.exchangeRate.toFixed(2)} por USDT`,
        },
      ],
      footerMessage:
        "Seus USDT foram creditados na sua conta e já estão disponíveis para uso. Este comprovante serve como recibo oficial da transação.",
      status: "CONCLUÍDO",
    });

    const result = await sendEmail({
      to: data.userEmail,
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(`✅ Purchase receipt sent to ${data.userEmail}`);
      await logSentEmailByEmail({
        userEmail: data.userEmail,
        type: "receipt",
        subject,
        metadata: { kind: "purchase_receipt" },
      });
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
        ? "CONCLUÍDO"
        : data.status === "PENDING"
        ? "PENDENTE"
        : data.status === "PROCESSING"
        ? "PROCESSANDO"
        : "FALHOU";

    const subject = `BS Market - Comprovante de Saque PIX #${data.protocol}`;

    const text = `
Comprovante de Saque PIX - BS Market

Protocolo: ${data.protocol}
Data: ${formattedDate}
Status: ${statusText}

Valor Solicitado: R$ ${data.amount.toFixed(2)}
Taxa (3%): R$ ${data.fee.toFixed(2)}
Valor Líquido Recebido: R$ ${data.netAmount.toFixed(2)}

Chave PIX: ${data.pixKey}
`;

    const footerMessage =
      data.status === "COMPLETED"
        ? "Seu saque PIX foi processado e o valor foi enviado para a chave PIX informada. Este comprovante serve como recibo oficial da transação."
        : data.status === "PENDING"
        ? "Seu saque PIX está aguardando processamento. Você receberá uma notificação quando for concluído."
        : "Seu saque PIX está sendo processado. Você receberá uma notificação quando for concluído.";

    const html = generateBankReceiptHTML({
      title: "Comprovante de Saque PIX",
      transactionId: data.protocol,
      date: formattedDate,
      userName: data.userName,
      items: [
        {
          label: "Valor Solicitado",
          value: `R$ ${data.amount.toFixed(2)}`,
        },
        {
          label: "Taxa (3%)",
          value: `R$ ${data.fee.toFixed(2)}`,
        },
        {
          label: "Valor Líquido Recebido",
          value: `R$ ${data.netAmount.toFixed(2)}`,
          highlight: true,
        },
        {
          label: "Chave PIX",
          value: data.pixKey,
        },
      ],
      footerMessage,
      status: statusText,
    });

    const result = await sendEmail({
      to: data.userEmail,
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(`✅ PIX withdrawal receipt sent to ${data.userEmail}`);
      await logSentEmailByEmail({
        userEmail: data.userEmail,
        type: "receipt",
        subject,
        metadata: { kind: "pix_withdrawal_receipt" },
      });
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
        ? "CONCLUÍDO"
        : data.status === "PENDING"
        ? "PENDENTE"
        : data.status === "PROCESSING"
        ? "PROCESSANDO"
        : "FALHOU";

    const subject = `BS Market - Comprovante de Saque #${
      data.transactionId?.slice(0, 8) || "N/A"
    }`;

    const text = `
Comprovante de Saque - BS Market

${data.transactionId ? `ID da Transação: ${data.transactionId}` : ""}
Data: ${formattedDate}
Status: ${statusText}
Rede: ${data.network}

Valor Solicitado: ${data.amount.toFixed(4)} USDT
Taxa de Rede (${data.network}): ${data.networkFee.toFixed(4)} USDT
Valor Líquido Recebido: ${data.netAmount.toFixed(4)} USDT

Endereço da Carteira: ${data.walletAddress}
${data.transactionHash ? `Hash da Transação: ${data.transactionHash}` : ""}
`;

    const footerMessage =
      data.status === "COMPLETED"
        ? "Seus USDT foram enviados para o endereço informado. A transação pode levar alguns minutos para aparecer na blockchain. Este comprovante serve como recibo oficial da transação."
        : data.status === "PENDING"
        ? "Seu saque está aguardando processamento. Você receberá uma notificação quando for concluído."
        : "Seu saque está sendo processado. Você receberá uma notificação quando for concluído.";

    const items = [
      {
        label: "Rede",
        value: data.network,
      },
      {
        label: "Valor Solicitado",
        value: `${data.amount.toFixed(4)} USDT`,
      },
      {
        label: `Taxa de Rede (${data.network})`,
        value: `${data.networkFee.toFixed(4)} USDT`,
      },
      {
        label: "Valor Líquido Recebido",
        value: `${data.netAmount.toFixed(4)} USDT`,
        highlight: true,
      },
      {
        label: "Endereço da Carteira",
        value: data.walletAddress,
      },
    ];

    if (data.transactionHash) {
      items.push({
        label: "Hash da Transação",
        value: data.transactionHash,
      });
    }

    const html = generateBankReceiptHTML({
      title: "Comprovante de Saque",
      transactionId: data.transactionId || "N/A",
      date: formattedDate,
      userName: data.userName,
      items,
      footerMessage,
      status: statusText,
    });

    const result = await sendEmail({
      to: data.userEmail,
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(`✅ Withdrawal receipt sent to ${data.userEmail}`);
      await logSentEmailByEmail({
        userEmail: data.userEmail,
        type: "receipt",
        subject,
        metadata: { kind: "withdrawal_receipt" },
      });
    } else {
      console.error(`❌ Failed to send withdrawal receipt: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error("Error sending withdrawal receipt:", error);
    return { success: false, message: "Failed to send receipt email" };
  }
}

interface BalanceAdjustmentData {
  userName: string;
  userEmail: string;
  operation: "CREDIT" | "DEDUCT";
  amount: number;
  currency: string;
  previousBalance: number;
  newBalance: number;
  reason?: string | null;
  transactionId: string;
  date: Date;
}

export async function sendBalanceAdjustmentEmail(data: BalanceAdjustmentData) {
  try {
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data.date);

    const isCredit = data.operation === "CREDIT";
    const subject = `BS Market - Comprovante de ${
      isCredit ? "Crédito" : "Débito"
    } #${data.transactionId.slice(0, 8)}`;

    const text = `
Comprovante de ${isCredit ? "Crédito" : "Débito"} - BS Market

ID da Transação: ${data.transactionId}
Data: ${formattedDate}
Tipo: ${isCredit ? "Crédito" : "Débito"}
Moeda: ${data.currency}

${isCredit ? "Valor Creditado" : "Valor Deduzido"}: ${data.amount.toFixed(2)} ${
      data.currency
    }
Saldo Anterior: ${data.previousBalance.toFixed(2)} ${data.currency}
Novo Saldo: ${data.newBalance.toFixed(2)} ${data.currency}

${data.reason ? `Motivo: ${data.reason}` : ""}
`;

    const items = [
      {
        label: "Tipo de Operação",
        value: isCredit ? "Crédito" : "Débito",
      },
      {
        label: "Moeda",
        value: data.currency,
      },
      {
        label: isCredit ? "Valor Creditado" : "Valor Deduzido",
        value: `${data.amount.toFixed(2)} ${data.currency}`,
        highlight: true,
      },
      {
        label: "Saldo Anterior",
        value: `${data.previousBalance.toFixed(2)} ${data.currency}`,
      },
      {
        label: "Novo Saldo",
        value: `${data.newBalance.toFixed(2)} ${data.currency}`,
        highlight: true,
      },
    ];

    if (data.reason) {
      items.push({
        label: "Motivo",
        value: data.reason,
      });
    }

    const footerMessage = isCredit
      ? "O valor foi creditado na sua conta e já está disponível para uso. Este comprovante serve como recibo oficial da transação."
      : "O valor foi deduzido da sua conta conforme solicitado. Este comprovante serve como recibo oficial da transação.";

    const html = generateBankReceiptHTML({
      title: `Comprovante de ${isCredit ? "Crédito" : "Débito"}`,
      transactionId: data.transactionId,
      date: formattedDate,
      userName: data.userName,
      items,
      footerMessage,
      status: "CONCLUÍDO",
    });

    const result = await sendEmail({
      to: data.userEmail,
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(
        `✅ Balance adjustment email sent to ${data.userEmail} (${data.operation})`
      );
      await logSentEmailByEmail({
        userEmail: data.userEmail,
        type: "receipt",
        subject,
        metadata: { kind: "balance_adjustment", operation: data.operation },
      });
    } else {
      console.error(
        `❌ Failed to send balance adjustment email: ${result.message}`
      );
    }

    return result;
  } catch (error) {
    console.error("Error sending balance adjustment email:", error);
    return {
      success: false,
      message: "Failed to send balance adjustment email",
    };
  }
}
