import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "@/lib/env/server";

import * as schema from "./schema";

let database: NeonHttpDatabase<typeof schema> | undefined;

export function getDatabase() {
  if (!database) {
    const sql = neon(getDatabaseUrl());
    database = drizzle(sql, { schema });
  }

  return database;
}
