import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/flowpilot_test";
process.env.NEXTAUTH_SECRET ??= "0123456789abcdef0123456789abcdef";
process.env.SKIP_ENV_VALIDATION ??= "1";
