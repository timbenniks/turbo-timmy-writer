import { getAllowedSession } from "@/auth/session";
import { getPortableWritingBackupForUser } from "@/db/queries/export";
import { portableBackupFilename } from "@/export/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAllowedSession();
  if (!session) return Response.json({ error: "Your session has expired." }, { status: 401 });
  const exportedAt = new Date();
  const backup = await getPortableWritingBackupForUser(session.user.id, exportedAt);
  return new Response(`${JSON.stringify(backup, null, 2)}\n`, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${portableBackupFilename(exportedAt)}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
