import { redirect } from "next/navigation";

import { getAllowedSession } from "@/auth/session";
import { AppShell } from "@/components/writing/app-shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getAllowedSession();
  if (!session) {
    redirect("/sign-in");
  }

  return <AppShell githubLogin={session.user.githubLogin} />;
}
