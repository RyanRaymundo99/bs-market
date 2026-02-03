/**
 * Returns the URL to use for <img src> for a KYC document.
 * If the stored URL is HEIC/HEIF, returns the proxy URL that converts to JPEG so browsers can display it.
 */
export function getKycImageSrc(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const lower = url.toLowerCase();
  if (
    lower.endsWith(".heic") ||
    lower.endsWith(".heif") ||
    lower.includes(".heic") ||
    lower.includes(".heif")
  ) {
    return `/api/kyc-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
