import { describe, expect, it } from "vitest";

import { deliverySnapshotHash } from "./model";

describe("delivery audit snapshots", () => {
  it("hashes semantically identical objects deterministically", () => {
    expect(deliverySnapshotHash({ subject: "Hello", body: "Body" }))
      .toBe(deliverySnapshotHash({ body: "Body", subject: "Hello" }));
    expect(deliverySnapshotHash({ body: "Changed", subject: "Hello" }))
      .not.toBe(deliverySnapshotHash({ body: "Body", subject: "Hello" }));
  });
});
