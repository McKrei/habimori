import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)));
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseTestEmail = process.env.SUPABASE_TEST_EMAIL;
const supabaseTestPassword = process.env.SUPABASE_TEST_PASSWORD;
const hasSupabaseEnv = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseTestEmail && supabaseTestPassword,
);
const include = ["tests/unit/**/*.{test,spec}.{ts,tsx}"];
if (hasSupabaseEnv) {
  include.push("tests/integration/**/*.{test,spec}.{ts,tsx}");
}

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include,
    clearMocks: true,
  },
});
