import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "@/components/pages/Dashboard";
import {auth} from "@/lib/auth";

const dashboardPage = async () => {
  const session=await auth.api.getSession({headers: await headers()});
    if(!session){
        redirect("/login");
    }
  return (
    <>
      <Dashboard />
    </>
  );
};
export default dashboardPage;
