import { NextResponse } from "next/server";
import { z } from "zod";

export type ApiErrorBody = {
  error: string;
  details?: unknown;
};

export function jsonOk<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function jsonError(message: string, status: number, details?: unknown) {
  const body: ApiErrorBody = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function handleZodError(error: unknown) {
  if (error instanceof z.ZodError) {
    return jsonError("Validation failed", 422, error.flatten());
  }
  return null;
}
