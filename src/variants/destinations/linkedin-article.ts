import { destinationProfileSchema } from "./profile";

export const linkedinArticleProfile = destinationProfileSchema.parse({
  id: "linkedin-article",
  version: "v1",
  destination: "linkedin-article",
  name: "LinkedIn article",
  instructions: [
    "Preserve the article's complete argument while adapting links and references for a LinkedIn reader.",
    "Return a specific sentence-case title and Markdown body without an H1.",
    "Keep useful H2/H3 headings and readable paragraph breaks.",
    "Remove website-only frontmatter or publishing mechanics.",
  ],
});
