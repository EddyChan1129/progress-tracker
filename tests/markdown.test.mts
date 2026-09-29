import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allowedMarkdownElements,
  markdownUrlTransform,
} from "../src/features/learning/markdown.ts";

describe("safe Markdown settings", () => {
  it("allows only HTTP and HTTPS links", () => {
    assert.equal(
      markdownUrlTransform("https://example.com", "href"),
      "https://example.com",
    );
    assert.equal(
      markdownUrlTransform("http://example.com", "href"),
      "http://example.com",
    );
    assert.equal(markdownUrlTransform("javascript:alert(1)", "href"), undefined);
    assert.equal(markdownUrlTransform("data:text/html,test", "href"), undefined);
  });

  it("does not allow Markdown images", () => {
    assert.equal(allowedMarkdownElements.includes("img"), false);
    assert.equal(
      markdownUrlTransform("https://example.com/image.png", "src"),
      undefined,
    );
  });
});
