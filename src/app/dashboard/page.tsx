import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "@/components/pages/Dashboard";

const dashboardPage = async () => {
  return (
    <>
      <Dashboard />
    </>
  );
};
export default dashboardPage;
