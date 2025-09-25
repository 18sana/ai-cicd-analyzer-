import { describe, expect, it } from "vitest";
import { registerSchema, taskCreateSchema } from "@/lib/validators";

describe("registerSchema", () => {
  it("rejects short passwords", () => {
    const res = registerSchema.safeParse({ email: "a@b.com", password: "short" });
    expect(res.success).toBe(false);
  });

  it("accepts valid payloads", () => {
    const res = registerSchema.safeParse({ email: "a@b.com", password: "longenough", name: "Ada" });
    expect(res.success).toBe(true);
  });
});

describe("taskCreateSchema", () => {
  it("requires title", () => {
    const res = taskCreateSchema.safeParse({});
    expect(res.success).toBe(false);
  });
});
