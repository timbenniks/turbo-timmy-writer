import { destinationProfileSchema } from "./profile";

export const linkedinPostProfile = destinationProfileSchema.parse({
  id: "linkedin-post",
  version: "v1",
  destination: "linkedin-post",
  name: "LinkedIn post",
  instructions: [
    "Express one useful idea in 100 to 200 words by default and never exceed 3,000 characters.",
    "Lead with the sharpest sentence before the see-more cut.",
    "Use one- or two-sentence paragraphs and line breaks for rhythm.",
    "Make the post stand alone instead of teasing the article.",
    "End with a take, not engagement bait. Use no emoji and at most five useful hashtags.",
  ],
});
