import { createHash } from "node:crypto";

export const deliveryProviders = ["buttondown", "contentstack", "linkedin"] as const;
export const deliveryOperations = ["create-draft", "publish"] as const;
export const deliveryStatuses = ["pending", "succeeded", "failed"] as const;

export type DeliveryProvider = (typeof deliveryProviders)[number];
export type DeliveryOperation = (typeof deliveryOperations)[number];

function orderedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderedJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, orderedJson(item)]),
    );
  }
  return value;
}

export function deliverySnapshotHash(snapshot: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(orderedJson(snapshot))).digest("hex");
}
