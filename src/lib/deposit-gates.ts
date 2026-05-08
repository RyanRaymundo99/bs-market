import { NextResponse } from "next/server";

/** Deposit flows: approval gate only (no KYC gate). */
export function depositApprovalResponse(user: {
  approvalStatus: string;
}): NextResponse | null {
  if (user.approvalStatus === "REJECTED") {
    return NextResponse.json(
      { error: "Sua conta foi rejeitada. Entre em contato com o suporte." },
      { status: 403 }
    );
  }
  if (user.approvalStatus === "PENDING") {
    return NextResponse.json(
      {
        error:
          "Sua conta est\u00e1 pendente de aprova\u00e7\u00e3o. Complete seu cadastro e aguarde a aprova\u00e7\u00e3o.",
      },
      { status: 403 }
    );
  }
  return null;
}

/** Approval + verified KYC required (e.g. PIX purchase of USDT). */
export function depositFullEligibilityResponse(user: {
  approvalStatus: string;
  kycStatus: string;
}): NextResponse | null {
  const approvalOnly = depositApprovalResponse(user);
  if (approvalOnly) return approvalOnly;
  if (user.kycStatus === "PENDING") {
    return NextResponse.json(
      {
        error:
          "Sua verifica\u00e7\u00e3o KYC est\u00e1 pendente. Complete o upload dos documentos KYC para realizar dep\u00f3sitos.",
      },
      { status: 403 }
    );
  }
  return null;
}
