"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function DebugPage() {
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const sessionData = await authClient.getSession();
        console.log("Debug Session:", sessionData);
        setSession(sessionData);
      } catch (err) {
        console.error("Debug Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Session</h1>

      {loading && <p>Loading session...</p>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {session && typeof session === "object" && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong>Session found:</strong>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      )}

      {!loading && !session && !error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <strong>No session found</strong>
        </div>
      )}
    </div>
  );
}
