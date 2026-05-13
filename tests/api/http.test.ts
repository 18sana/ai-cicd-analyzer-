import { describe, expect, it } from "vitest";
import { handleZodError, jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

describe("http helpers", () => {
  it("jsonOk sets body", async () => {
    const res = jsonOk({ ok: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("jsonError includes message", async () => {
    const res = jsonError("nope", 400);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "nope" });
  });

  it("handleZodError maps zod issues", () => {
    const parsed = z.object({ a: z.string() }).safeParse({});
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const res = handleZodError(parsed.error);
      expect(res?.status).toBe(422);
    }
  });
});
