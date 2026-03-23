import { NextResponse } from "next/server";

/**
 * Returns the outbound (egress) IP of this server.
 * Use this to see which IP to whitelist in your payment provider (e.g. Mercado Pago).
 *
 * - On Vercel without Static IPs: the IP can change per invocation (dynamic).
 * - With Vercel Static IPs (Pro): you get fixed IP(s); call this after enabling to confirm the value.
 * - On a VPS/own server: you get your server's public IP.
 */
export async function GET() {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`ipify failed: ${res.status}`);
    const data = (await res.json()) as { ip: string };
    return NextResponse.json({
      ip: data.ip,
      note: "Use this IP to whitelist in your payment provider settings. On Vercel free/hobby the IP may change unless you use Static IPs (Pro).",
    });
  } catch (e) {
    console.error("egress-ip error:", e);
    return NextResponse.json(
      { error: "Could not determine egress IP" },
      { status: 500 }
    );
  }
}
