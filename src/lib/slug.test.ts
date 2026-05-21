import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("normalizes text to kebab-case", () => {
    expect(slugify("My Cool Project!!!")).toBe("should-fail-pipeline");
  });

  it("trims edges", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });
});
