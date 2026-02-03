declare module "heic-convert" {
  interface ConvertOptions {
    buffer: Buffer | ArrayBuffer | Uint8Array;
    format?: "JPEG" | "PNG";
    quality?: number;
  }
  function convert(options: ConvertOptions): Promise<ArrayBuffer | Uint8Array>;
  export default convert;
}
