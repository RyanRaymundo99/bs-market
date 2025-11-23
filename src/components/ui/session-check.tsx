"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export function SessionCheck() {
  const [sessionStatus, setSessionStatus] = useState<{
    isValid: boolean;
    loading: boolean;
    error?: string;
    sessionData?: {
      user?: {
        name?: string;
        email?: string;
        approvalStatus?: string;
      };
    };
  }>({
    isValid: false,
    loading: true,
  });

  const checkSession = async () => {
    setSessionStatus((prev) => ({ ...prev, loading: true }));

    try {
      const response = await fetch("/api/auth/validate-session");
      const data = await response.json();

      if (response.ok) {
        setSessionStatus({
          isValid: true,
          loading: false,
          sessionData: data,
        });
      } else {
        setSessionStatus({
          isValid: false,
          loading: false,
          error: data.error || "Session validation failed",
        });
      }
    } catch {
      setSessionStatus({
        isValid: false,
        loading: false,
        error: "Network error",
      });
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (sessionStatus.loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-300" />
          <p>Checking session...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {sessionStatus.isValid ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          Session Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessionStatus.isValid ? (
          <div className="space-y-2">
            <p className="text-green-600 font-medium">Session is valid</p>
            {sessionStatus.sessionData && (
              <div className="text-sm text-gray-600">
                <p>
                  <strong>User:</strong> {sessionStatus.sessionData.user?.name}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {sessionStatus.sessionData.user?.email}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {sessionStatus.sessionData.user?.approvalStatus}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-red-600 font-medium">Session is invalid</p>
            {sessionStatus.error && (
              <p className="text-sm text-gray-600">{sessionStatus.error}</p>
            )}
          </div>
        )}

        <Button onClick={checkSession} variant="outline" className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Session
        </Button>

        {!sessionStatus.isValid && (
          <Button
            onClick={() => (window.location.href = "/login")}
            className="w-full"
          >
            Go to Login
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
