import { destinationProfileSchema } from "./profile";

export const websiteProfile = destinationProfileSchema.parse({
  id: "website-article",
  version: "v1",
  destination: "website",
  name: "Website article",
  instructions: [
    "Preserve the complete argument and useful technical detail.",
    "Return clean Markdown body content without frontmatter or an H1 title.",
    "Write a specific description that accurately summarizes the article in at most 320 characters.",
    "Keep the supplied slug unless the title requires a clearer destination slug.",
  ],
});
