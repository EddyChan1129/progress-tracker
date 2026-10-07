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
    assert.equal(
      markdownUrlTransform("javascript:alert(1)", "href"),
      undefined,
    );
    assert.equal(
      markdownUrlTransform("data:text/html,test", "href"),
      undefined,
    );
  });

  it("does not allow Markdown images", () => {
    assert.equal(allowedMarkdownElements.includes("img"), false);
    assert.equal(
      markdownUrlTransform("https://example.com/image.png", "src"),
      undefined,
    );
  });
});

const { insertCodeBlock } =
  await import("../src/features/learning/code-block.ts");
describe("insert code block", () => {
  it("places the cursor inside an empty JavaScript block", () => {
    const result = insertCodeBlock("", 0, 0, "js");
    assert.equal(result.content, "```js\n\n```");
    assert.equal(result.start, 6);
    assert.equal(result.end, 6);
  });
  it("preserves selected code and separates surrounding prose", () => {
    const result = insertCodeBlock("before const n = 1; after", 7, 19, "ts");
    assert.equal(
      result.content.slice(result.start, result.end),
      "const n = 1;",
    );
    assert.ok(result.content.startsWith("before \n```ts\n"));
    assert.ok(result.content.endsWith("\n```\n after"));
  });
  it("uses a longer fence when code contains backticks", () => {
    const result = insertCodeBlock("```", 0, 3, "text");
    assert.equal(result.content, "````text\n```\n````");
  });
});
