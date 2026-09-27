import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { categorySchema } from "../src/features/categories/schemas/category.schema.ts"

describe("categorySchema", () => {
    it("rejects a blank category name", () => {
        const result = categorySchema.safeParse({ name: "   " })

        assert.equal(result.success, false)
    })

    it("accepts and trims a valid category name", () => {
        const result = categorySchema.safeParse({ name: "  LeetCode  " })

        assert.equal(result.success, true)
        if (result.success) assert.equal(result.data.name, "LeetCode")
    })

    it("rejects an icon longer than 10 characters", () => {
        const result = categorySchema.safeParse({
            name: "LeetCode",
            icon: "12345678901",
        })

        assert.equal(result.success, false)
    })
})
