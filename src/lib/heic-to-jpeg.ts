/**
 * Convert HEIC/HEIF buffer to JPEG buffer (server-side).
 * Use before storing KYC images so browsers can display them.
 */
export async function heicToJpegBuffer(inputBuffer: Buffer): Promise<Buffer> {
  const convert = (await import("heic-convert")).default;
  const outputBuffer = await convert({
    buffer: inputBuffer,
    format: "JPEG",
    quality: 0.92,
  });
  const bytes =
    outputBuffer instanceof Uint8Array
      ? outputBuffer
      : new Uint8Array(outputBuffer as ArrayBuffer);
  return Buffer.from(bytes);
}

export function isHeicFile(file: { name: string; type?: string }): boolean {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type === "image/heic" ||
    type === "image/heif"
  );
}
