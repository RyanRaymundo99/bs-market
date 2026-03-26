import { mercadoPagoService } from "../../src/lib/payment/mercadopago";

async function main() {
  console.log("CHECKING MERCADO PAGO ACCESS TOKEN...");
  const balance = await mercadoPagoService.getUSDTBalance();
  console.log("RESPONSE:", JSON.stringify(balance, null, 2));
}

main().catch(console.error);

