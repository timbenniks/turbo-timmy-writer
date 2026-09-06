import { describe, expect, it } from "vitest";

import { portableBackupFilename, portableBackupVersion } from "./model";

describe("portable writing backup", () => {
  it("uses a versioned, date-stable JSON contract", () => {
    expect(portableBackupVersion).toBe(1);
    expect(portableBackupFilename(new Date("2026-09-06T23:59:59Z")))
      .toBe("turbo-timmy-writer-2026-09-06.json");
  });
});
