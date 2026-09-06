import { describe, expect, it } from "vitest";

import { buttondownDraftSnapshot } from "./newsletter";

describe("newsletter delivery snapshot", () => {
  it("renders the exact audited Buttondown draft without changing its variant", () => {
    expect(buttondownDraftSnapshot({
      version: 1,
      destination: "newsletter",
      intro: "Intro",
      bodyMarkdown: "Body",
      callToAction: "Read more",
    }, {
      version: 1,
      destination: "newsletter",
      subject: "Subject",
      previewText: "Preview",
    })).toEqual({
      subject: "Subject",
      body: "Intro\n\nBody\n\nRead more",
      status: "draft",
    });
  });
});
