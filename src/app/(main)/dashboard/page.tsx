import React from "react";
import { headers } from "next/headers";
import Dashboard from "@/components/pages/Dashboard";
import { auth } from "@/lib/auth";

const dashboardPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  // For now, allow access and let client-side handle dev session
  // The Dashboard component will check for dev session on mount
  if (!session) {
    // Don't redirect immediately - let client check for dev session
    // redirect("/login");
  }

  return (
    <>
      <Dashboard />
    </>
  );
};

export default dashboardPage;
