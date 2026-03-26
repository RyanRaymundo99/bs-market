/**
 * Client-side authentication utilities
 */

/**
 * Perform a complete logout and redirect to home
 */
export const handleLogout = async () => {
  try {
    // Call logout API to clear session
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Clear local storage
    localStorage.removeItem("auth-session");
    localStorage.removeItem("user");
    localStorage.removeItem("auth-user");
    sessionStorage.clear();

    // Force redirect to home page using window.location for reliability
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
    // Even if API fails, clear local storage and redirect
    localStorage.removeItem("auth-session");
    localStorage.removeItem("user");
    localStorage.removeItem("auth-user");
    sessionStorage.clear();
    // Force redirect using window.location
    window.location.href = "/";
  }
};
