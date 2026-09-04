import type { VariantDestination } from "../model";
import { linkedinArticleProfile } from "./linkedin-article";
import { linkedinPostProfile } from "./linkedin-post";
import { newsletterProfile } from "./newsletter";
import type { DestinationProfile } from "./profile";
import { websiteProfile } from "./website";

export const destinationProfiles = {
  website: websiteProfile,
  "linkedin-post": linkedinPostProfile,
  "linkedin-article": linkedinArticleProfile,
  newsletter: newsletterProfile,
} satisfies Record<VariantDestination, DestinationProfile>;

export function getDestinationProfile(destination: VariantDestination) {
  return destinationProfiles[destination];
}
