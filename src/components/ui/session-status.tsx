"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, LogOut } from "lucide-react";
import { SessionManager } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

interface SessionStatusProps {
  onLogout: () => void;
}

export function SessionStatus({ onLogout }: SessionStatusProps) {
  const [sessionInfo, setSessionInfo] = useState(
    SessionManager.getSessionInfo()
  );
  const [isExtending, setIsExtending] = useState(false);
  const { toast } = useToast();

  // Update session info every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionInfo(SessionManager.getSessionInfo());
    }, 60 * 1000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      const success = SessionManager.extendSession();
      if (success) {
        setSessionInfo(SessionManager.getSessionInfo());
        toast({
          title: "Session Extended",
          description: "Your session has been extended by 1 hour.",
        });
      } else {
        toast({
          title: "Extension Failed",
          description: "Unable to extend session. Please log in again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Extension Failed",
        description: "An error occurred while extending your session.",
        variant: "destructive",
      });
    } finally {
      setIsExtending(false);
    }
  };

  if (!sessionInfo.isValid || !sessionInfo.user) {
    return null;
  }

  const getTimeColor = (minutes: number) => {
    if (minutes <= 5) return "text-red-400";
    if (minutes <= 15) return "text-yellow-400";
    return "text-green-400";
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-[20px] z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-300" />
          <span className="text-sm text-gray-300">Session:</span>
          <span
            className={`text-sm font-medium ${getTimeColor(
              sessionInfo.remainingMinutes
            )}`}
          >
            {formatTime(sessionInfo.remainingMinutes)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExtendSession}
            disabled={isExtending}
            className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-white/10"
            title="Extend session by 1 hour"
          >
            <RefreshCw
              className={`w-4 h-4 ${isExtending ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onLogout}
            className="h-8 w-8 p-0 text-gray-300 hover:text-red-400 hover:bg-red-400/10"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {sessionInfo.remainingMinutes <= 5 && (
        <div className="mt-2 text-xs text-red-400">
          ⚠️ Session expires soon. Click refresh to extend.
        </div>
      )}
    </div>
  );
}
