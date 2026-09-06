import {
  createCloudinaryUploader,
  CloudinaryUploadError,
  isSupportedCloudinaryImage,
} from "@/assets/cloudinary";
import { getAllowedSession } from "@/auth/session";
import { readCloudinaryEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAllowedSession();
  if (!session) return Response.json({ error: "Your session has expired." }, { status: 401 });
  const environment = readCloudinaryEnvironment();
  if (!environment) return Response.json({ error: "Managed image uploads are not configured." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (!isSupportedCloudinaryImage(file.type, file.size)) {
    return Response.json({ error: "Choose a JPEG, PNG, WebP, AVIF, or GIF image up to 10 MB." }, { status: 400 });
  }

  try {
    const upload = createCloudinaryUploader(environment);
    const result = await upload({
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type,
      filename: file.name,
    });
    return Response.json({ upload: result }, { status: 201 });
  } catch (error) {
    const status = error instanceof CloudinaryUploadError && error.code === "invalid-file" ? 400 : 502;
    return Response.json({ error: error instanceof CloudinaryUploadError ? error.message : "The image could not be uploaded." }, { status });
  }
}
