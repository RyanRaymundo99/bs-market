import { mercadoPagoService } from "../../src/lib/payment/mercadopago";

async function main() {
  const mpId = "0478537131"; // From the latest pending order
  const status = await mercadoPagoService.getTransactionStatus(mpId);
  console.log("STATUS FOR ID", mpId, ":", JSON.stringify(status, null, 2));
}

main().catch(console.error);

