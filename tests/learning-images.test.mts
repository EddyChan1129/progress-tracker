import assert from "node:assert/strict";
import { it } from "node:test";

import {
  MAX_LEARNING_IMAGE_BYTES,
  validateLearningImages,
} from "../src/features/learning/images.ts";

it("accepts supported images at the size and total-count boundaries", () => {
  const files = ["image/jpeg", "image/png", "image/webp"].map((type) => ({
    type,
    size: MAX_LEARNING_IMAGE_BYTES,
  }));
  assert.equal(validateLearningImages(files, 2), null);
});

it("rejects oversized, empty, unsupported or excess files", () => {
  assert.notEqual(validateLearningImages([{ type: "image/png", size: MAX_LEARNING_IMAGE_BYTES + 1 }], 0), null);
  assert.notEqual(validateLearningImages([{ type: "image/png", size: 0 }], 0), null);
  for (const type of ["image/svg+xml", "image/gif", "application/pdf", ""]) {
    assert.notEqual(validateLearningImages([{ type, size: 100 }], 0), null);
  }
  assert.notEqual(validateLearningImages([{ type: "image/png", size: 100 }], 5), null);
});
