import NextAuth from "next-auth";
import type { NextRequest } from "next/server";

import { createAuthOptions } from "@/auth/config";
import { readAuthEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";

type AuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

function unavailableResponse() {
  return Response.json(
    { error: "GitHub authentication is not configured." },
    { status: 503 },
  );
}

async function handler(request: NextRequest, context: AuthRouteContext) {
  const environment = readAuthEnvironment();
  if (!environment) {
    return unavailableResponse();
  }

  return NextAuth(request, context, createAuthOptions(environment));
}

export { handler as GET, handler as POST };
