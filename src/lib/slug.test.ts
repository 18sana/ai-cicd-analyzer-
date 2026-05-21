import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("normalizes text to kebab-case", () => {
    expect(slugify("My Cool Project!!!")).toBe("my-cool-project");
  });

  it("trims edges", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });
});
