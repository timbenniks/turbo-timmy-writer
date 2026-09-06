import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

export const MAX_CLOUDINARY_UPLOAD_BYTES = 10 * 1024 * 1024;
const supportedImageTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isSupportedCloudinaryImage(mimeType: string, size: number) {
  return size > 0 && size <= MAX_CLOUDINARY_UPLOAD_BYTES && supportedImageTypes.has(mimeType);
}

const uploadResponseSchema = z.object({
  secure_url: z.url().startsWith("https://"),
  public_id: z.string().min(1).max(500),
  format: z.string().min(1).max(30),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
});

export type CloudinaryUpload = {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
};

export class CloudinaryUploadError extends Error {
  constructor(public readonly code: "invalid-file" | "provider-failure") {
    super(code === "invalid-file" ? "The selected image is invalid." : "The image provider could not complete the upload.");
    this.name = "CloudinaryUploadError";
  }
}

export function createCloudinaryUploader(config: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}) {
  const fetchImplementation = config.fetch ?? fetch;
  const now = config.now ?? Date.now;

  return async function upload(input: {
    bytes: Uint8Array;
    mimeType: string;
    filename: string;
  }): Promise<CloudinaryUpload> {
    if (
      !isSupportedCloudinaryImage(input.mimeType, input.bytes.byteLength)
    ) {
      throw new CloudinaryUploadError("invalid-file");
    }

    const timestamp = Math.floor(now() / 1000);
    const folder = "turbo-timmy-writer/heroes";
    const signature = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${config.apiSecret}`)
      .digest("hex");
    const form = new FormData();
    const fileBuffer = new ArrayBuffer(input.bytes.byteLength);
    new Uint8Array(fileBuffer).set(input.bytes);
    form.set("file", new Blob([fileBuffer], { type: input.mimeType }), input.filename.slice(0, 200));
    form.set("api_key", config.apiKey);
    form.set("timestamp", String(timestamp));
    form.set("folder", folder);
    form.set("signature", signature);

    try {
      const response = await fetchImplementation(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(config.timeoutMs ?? 30_000),
        },
      );
      if (!response.ok) throw new CloudinaryUploadError("provider-failure");
      const parsed = uploadResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new CloudinaryUploadError("provider-failure");
      return {
        url: parsed.data.secure_url,
        publicId: parsed.data.public_id,
        format: parsed.data.format,
        width: parsed.data.width,
        height: parsed.data.height,
        bytes: parsed.data.bytes,
      };
    } catch (error) {
      if (error instanceof CloudinaryUploadError) throw error;
      throw new CloudinaryUploadError("provider-failure");
    }
  };
}
