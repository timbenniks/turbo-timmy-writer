import { z } from "zod";

export const httpUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Use an HTTP or HTTPS URL.");
