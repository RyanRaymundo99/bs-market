"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import KYCBanner from "@/components/ui/kyc-banner";
import {
  isApprovedCelebrationBannerDismissed,
  syncApprovedCelebrationBannerDismissToServer,
} from "@/lib/account-approved-banner-dismiss";

interface UserStatus {
  id: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
  approvedCelebrationBannerDismissed?: boolean;
}

/** What the KYC strip should show — KYC dominates, then approval. */
export function deriveKycBannerStatus(
  u: UserStatus
): "PENDING" | "APPROVED" | "REJECTED" {
  if (u.kycStatus === "PENDING") return "PENDING";
  if (u.kycStatus === "APPROVED") return "APPROVED";
  if (u.kycStatus === "REJECTED") return "REJECTED";
  if (u.approvalStatus === "PENDING") return "PENDING";
  if (u.approvalStatus === "APPROVED") return "APPROVED";
  return "REJECTED";
}

const EXCLUDED_PATHS = [
  "/admin",
  "/login",
  "/signup",
  "/auth",
  "/forgot-password",
  "/reset-password",
];

export function GlobalKYCBanner() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const markedSeenRef = useRef(false);
  const pathname = usePathname();

  const shouldShowBanner = !EXCLUDED_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    markedSeenRef.current = false;

    if (!shouldShowBanner) {
      setLoading(false);
      setShowBanner(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/user/status", { cache: "no-store" });
        if (!response.ok || cancelled) return;

        const data = await response.json();
        if (!data.success || !data.user || cancelled) return;

        const status: UserStatus = {
          id: data.user.id,
          approvalStatus: data.user.approvalStatus,
          kycStatus: data.user.kycStatus,
          approvedCelebrationBannerDismissed:
            data.user.approvedCelebrationBannerDismissed === true,
        };

        setUserStatus(status);

        const bannerKind = deriveKycBannerStatus(status);

        if (bannerKind === "APPROVED") {
          const dismissed = isApprovedCelebrationBannerDismissed(
            status.id,
            status.approvedCelebrationBannerDismissed
          );
          setShowBanner(!dismissed);
          return;
        }

        setShowBanner(bannerKind === "PENDING" || bannerKind === "REJECTED");
      } catch (error) {
        console.error("Error fetching user status:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    load();

    return () => {
      cancelled = true;
    };
  }, [shouldShowBanner, pathname]);

  useEffect(() => {
    if (
      !showBanner ||
      !userStatus ||
      markedSeenRef.current ||
      deriveKycBannerStatus(userStatus) !== "APPROVED"
    ) {
      return;
    }

    markedSeenRef.current = true;
    syncApprovedCelebrationBannerDismissToServer(userStatus.id);
  }, [showBanner, userStatus]);

  const displayStatus = useMemo(
    () => (userStatus ? deriveKycBannerStatus(userStatus) : "PENDING"),
    [userStatus]
  );

  const handleDismiss = () => {
    if (!userStatus?.id) return;

    const kind = deriveKycBannerStatus(userStatus);
    if (kind === "APPROVED") {
      syncApprovedCelebrationBannerDismissToServer(userStatus.id);
      setShowBanner(false);
      return;
    }
    if (kind === "PENDING") {
      return;
    }
    setShowBanner(false);
  };

  if (loading || !showBanner || !userStatus) {
    return null;
  }

  return (
    <div className="GlobalKYCBanner w-full px-4 sm:px-6 lg:px-8 pt-4">
      <div className="max-w-7xl mx-auto">
        <KYCBanner
          status={displayStatus}
          onDismiss={handleDismiss}
          showDismiss={displayStatus !== "PENDING"}
        />
      </div>
    </div>
  );
}
