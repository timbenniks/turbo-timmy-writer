import { destinationProfileSchema } from "./profile";

export const newsletterProfile = destinationProfileSchema.parse({
  id: "newsletter-edition",
  version: "v1",
  destination: "newsletter",
  name: "Newsletter",
  instructions: [
    "Write a concrete subject and preview text that match the article's actual claim.",
    "Preserve the useful argument in the body without website frontmatter.",
    "Use a short optional personal intro only when supported by the canonical article.",
    "Use a concise optional call to action; do not invent a destination URL.",
  ],
});
