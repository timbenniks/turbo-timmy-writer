import {
  newsletterVariantContentSchema,
  newsletterVariantMetadataSchema,
} from "@/variants/model";

export function buttondownDraftSnapshot(content: unknown, metadata: unknown) {
  const parsedContent = newsletterVariantContentSchema.parse(content);
  const parsedMetadata = newsletterVariantMetadataSchema.parse(metadata);
  const body = [
    parsedContent.intro,
    parsedContent.bodyMarkdown,
    parsedContent.callToAction,
  ].filter((part): part is string => Boolean(part)).join("\n\n");
  return {
    subject: parsedMetadata.subject,
    body,
    status: "draft",
  } as const;
}
