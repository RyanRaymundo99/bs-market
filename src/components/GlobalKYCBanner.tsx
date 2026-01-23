"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import KYCBanner from "@/components/ui/kyc-banner";

interface UserStatus {
  id: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  kycStatus: "PENDING" | "APPROVED" | "REJECTED";
}

export function GlobalKYCBanner() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Don't show banner on admin pages, login, or auth pages
  const excludedPaths = [
    "/admin",
    "/login",
    "/signup",
    "/auth",
    "/forgot-password",
    "/reset-password",
  ];

  const shouldShowBanner = !excludedPaths.some((path) =>
    pathname.startsWith(path)
  );

  useEffect(() => {
    if (!shouldShowBanner) {
      setLoading(false);
      return;
    }

    const fetchUserStatus = async () => {
      try {
        const response = await fetch("/api/user/status");
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
  }, [shouldShowBanner, pathname]);

  useEffect(() => {
    if (!userStatus || !shouldShowBanner) {
      setShowBanner(false);
      return;
    }

    // Check if APPROVED banner was already dismissed for this user
    if (userStatus.kycStatus === "APPROVED") {
      const dismissedKey = `kyc-approved-banner-dismissed-${userStatus.id}`;
      const wasDismissed = localStorage.getItem(dismissedKey) === "true";
      setShowBanner(!wasDismissed);
    } else if (userStatus.kycStatus === "PENDING") {
      // For PENDING, always show banner (permanent)
      setShowBanner(true);
    } else if (userStatus.kycStatus === "REJECTED") {
      // For REJECTED, show banner
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [userStatus, shouldShowBanner]);

  const handleDismiss = () => {
    if (userStatus?.id && userStatus?.kycStatus === "APPROVED") {
      // For APPROVED status, mark as dismissed permanently for this user
      const dismissedKey = `kyc-approved-banner-dismissed-${userStatus.id}`;
      localStorage.setItem(dismissedKey, "true");
      setShowBanner(false);
    } else if (userStatus?.kycStatus === "PENDING") {
      // For PENDING status, do not allow dismissal (permanent banner)
      return;
    } else {
      // For other statuses (REJECTED), just hide temporarily
      setShowBanner(false);
    }
  };

  if (loading || !showBanner || !userStatus) {
    return null;
  }

  // Determine which status to show (prioritize KYC status)
  const displayStatus =
    userStatus.kycStatus === "PENDING"
      ? "PENDING"
      : userStatus.kycStatus === "APPROVED"
      ? "APPROVED"
      : userStatus.kycStatus === "REJECTED"
      ? "REJECTED"
      : userStatus.approvalStatus === "PENDING"
      ? "PENDING"
      : userStatus.approvalStatus === "APPROVED"
      ? "APPROVED"
      : "REJECTED";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-4">
      <div className="max-w-7xl mx-auto">
        <KYCBanner
          status={displayStatus as "PENDING" | "APPROVED" | "REJECTED"}
          onDismiss={handleDismiss}
          showDismiss={displayStatus !== "PENDING"}
        />
      </div>
    </div>
  );
}
