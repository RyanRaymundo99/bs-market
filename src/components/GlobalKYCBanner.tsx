"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import KYCBanner from "@/components/ui/kyc-banner";
import {
  isApprovedCelebrationBannerDismissed,
  persistApprovedCelebrationBannerDismiss,
} from "@/lib/account-approved-banner-dismiss";

interface UserStatus {
  id: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
}

/** What the KYC strip should show — KYC dominates, then approval. */
export function deriveKycBannerStatus(u: UserStatus): "PENDING" | "APPROVED" | "REJECTED" {
  if (u.kycStatus === "PENDING") return "PENDING";
  if (u.kycStatus === "APPROVED") return "APPROVED";
  if (u.kycStatus === "REJECTED") return "REJECTED";
  if (u.approvalStatus === "PENDING") return "PENDING";
  if (u.approvalStatus === "APPROVED") return "APPROVED";
  return "REJECTED";
}

export function GlobalKYCBanner() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const excludedPaths = [
    "/admin",
    "/login",
    "/signup",
    "/auth",
    "/forgot-password",
    "/reset-password",
  ];

  const shouldShowBanner = !excludedPaths.some((p) =>
    pathname.startsWith(p)
  );

  useEffect(() => {
    if (!shouldShowBanner) {
      setLoading(false);
      return;
    }

    const fetchUserStatus = async () => {
      try {
        const response = await fetch("/api/user/status", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUserStatus({
              id: data.user.id,
              approvalStatus: data.user.approvalStatus,
              kycStatus: data.user.kycStatus,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStatus();
  }, [shouldShowBanner]);

  useEffect(() => {
    if (!userStatus || !shouldShowBanner) {
      setShowBanner(false);
      return;
    }

    const bannerKind = deriveKycBannerStatus(userStatus);

    if (bannerKind === "APPROVED") {
      const dismissed = isApprovedCelebrationBannerDismissed(userStatus.id);
      setShowBanner(!dismissed);
      return;
    }
    if (bannerKind === "PENDING") {
      setShowBanner(true);
      return;
    }
    if (bannerKind === "REJECTED") {
      setShowBanner(true);
      return;
    }
    setShowBanner(false);
  }, [userStatus, shouldShowBanner]);

  const displayStatus = useMemo(
    () => (userStatus ? deriveKycBannerStatus(userStatus) : "PENDING"),
    [userStatus]
  );

  const handleDismiss = () => {
    if (!userStatus?.id) return;

    const kind = deriveKycBannerStatus(userStatus);
    if (kind === "APPROVED") {
      persistApprovedCelebrationBannerDismiss(userStatus.id);
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