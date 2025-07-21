import { createAuthClient } from "better-auth/react";

// Determine the base URL for authentication
const getBaseURL = () => {
  // If we have a public environment variable, use it
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }

  // If we're in the browser, use the current origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Fallback for server-side rendering
  return "http://localhost:3000";
};

export const authClient = createAuthClient({
  /** The base URL of the server */
  baseURL: getBaseURL(),
});
