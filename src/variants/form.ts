import {
  variantPayloadSchema,
  type VariantContent,
  type VariantDestination,
  type VariantMetadata,
  type VariantStatus,
} from "./model";

export type VariantForm = {
  bodyMarkdown: string;
  title: string;
  slug: string;
  description: string;
  canonicalUrl: string;
  publicationUrl: string;
  subject: string;
  previewText: string;
  intro: string;
  callToAction: string;
  status: VariantStatus;
};

export function variantFormFromStored(input: {
  contentJson: VariantContent;
  metadataJson: VariantMetadata;
  status: VariantStatus;
}): VariantForm {
  const content = input.contentJson;
  const metadata = input.metadataJson;
  return {
    bodyMarkdown: content.bodyMarkdown,
    title: "title" in metadata ? metadata.title : "",
    slug: "slug" in metadata ? metadata.slug : "",
    description: "description" in metadata ? metadata.description : "",
    canonicalUrl: "canonicalUrl" in metadata ? metadata.canonicalUrl ?? "" : "",
    publicationUrl: "publicationUrl" in metadata ? metadata.publicationUrl ?? "" : "",
    subject: "subject" in metadata ? metadata.subject : "",
    previewText: "previewText" in metadata ? metadata.previewText : "",
    intro: "intro" in content ? content.intro ?? "" : "",
    callToAction: "callToAction" in content ? content.callToAction ?? "" : "",
    status: input.status,
  };
}

export function variantPayloadFromForm(destination: VariantDestination, form: VariantForm) {
  const base = { version: 1 as const, destination, bodyMarkdown: form.bodyMarkdown };
  const payload = destination === "website"
    ? {
        content: base,
        metadata: {
          version: 1 as const,
          destination,
          title: form.title,
          slug: form.slug,
          description: form.description,
          canonicalUrl: form.canonicalUrl || null,
        },
      }
    : destination === "linkedin-post"
      ? {
          content: base,
          metadata: {
            version: 1 as const,
            destination,
            publicationUrl: form.publicationUrl || null,
          },
        }
      : destination === "linkedin-article"
        ? {
            content: base,
            metadata: {
              version: 1 as const,
              destination,
              title: form.title,
              publicationUrl: form.publicationUrl || null,
            },
          }
        : {
            content: {
              ...base,
              intro: form.intro || null,
              callToAction: form.callToAction || null,
            },
            metadata: {
              version: 1 as const,
              destination,
              subject: form.subject,
              previewText: form.previewText,
            },
          };
  return variantPayloadSchema.parse(payload);
}
