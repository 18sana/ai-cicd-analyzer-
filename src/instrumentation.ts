export async function register() {
  if (process.env.SKIP_ENV_VALIDATION === "1") return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    validateEnv();
  }
}
