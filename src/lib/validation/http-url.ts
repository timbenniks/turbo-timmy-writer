import { z } from "zod";

export const httpUrlSchema = z.url().refine(
  (value) => value.startsWith("http://") || value.startsWith("https://"),
  "Use an HTTP or HTTPS URL.",
);
