"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EnvDebug() {
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkEnvironment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/test-env");
      const data = await response.json();
      setEnvInfo(data);
    } catch (error) {
      console.error("Error checking environment:", error);
      setEnvInfo({ error: "Failed to check environment" });
    } finally {
      setLoading(false);
    }
  };

  // Only show in development or when explicitly enabled
  if (
    process.env.NODE_ENV !== "development" &&
    !process.env.NEXT_PUBLIC_DEBUG_ENV
  ) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 w-80 bg-black/80 border border-white/10 backdrop-blur-[20px] z-50">
      <CardHeader>
        <CardTitle className="text-sm text-white">Environment Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={checkEnvironment}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          {loading ? "Checking..." : "Check Environment"}
        </Button>

        {envInfo && (
          <div className="text-xs space-y-1">
            <div>Node Env: {envInfo.nodeEnv}</div>
            <div>
              Has Google Client ID: {envInfo.hasGoogleClientId ? "✅" : "❌"}
            </div>
            <div>
              Has Google Client Secret:{" "}
              {envInfo.hasGoogleClientSecret ? "✅" : "❌"}
            </div>
            <div>
              Has Better Auth URL: {envInfo.hasBetterAuthUrl ? "✅" : "❌"}
            </div>
            <div>Better Auth URL: {envInfo.betterAuthUrl || "Not set"}</div>
            {envInfo.error && (
              <div className="text-red-400">Error: {envInfo.error}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
