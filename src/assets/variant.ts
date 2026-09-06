import type { ExternalHeroImage } from "./model";
import type { VariantMetadata } from "@/variants/model";

export function applyCanonicalHeroToVariant(
  metadata: VariantMetadata,
  heroImage: ExternalHeroImage | undefined,
): VariantMetadata {
  return metadata.destination === "website" && heroImage
    ? { ...metadata, imageUrl: heroImage.url }
    : metadata;
}
