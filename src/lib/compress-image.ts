/**
 * Compress an image File in the browser for KYC uploads (Vercel body size limits).
 * Returns a JPEG File (or the original if compression is not applicable / fails).
 */
export async function compressImageForUpload(
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number; maxBytes?: number }
): Promise<File> {
  const maxWidth = options?.maxWidth ?? 1920;
  const maxHeight = options?.maxHeight ?? 1920;
  const quality = options?.quality ?? 0.82;
  const maxBytes = options?.maxBytes ?? 1.5 * 1024 * 1024;

  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    return file;
  }

  // HEIC often cannot be decoded in-browser; server handles conversion
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    return file;
  }

  if (file.size <= maxBytes && file.size <= 800 * 1024) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let q = quality;
    let blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", q)
    );

    while (blob && blob.size > maxBytes && q > 0.45) {
      q -= 0.1;
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    }

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "document";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
