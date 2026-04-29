// src/lib/env.ts

type EnvSchema = {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_APP_NAME?: string;
};

// Helper to enforce required env vars
function requireEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
      `Make sure it is defined in your .env.local file and prefixed with NEXT_PUBLIC_.`
    );
  }
  return value;
}

// Validate ONLY safe frontend variables
export const env: EnvSchema = {
  NEXT_PUBLIC_API_URL: requireEnv(
    process.env.NEXT_PUBLIC_API_URL,
    "NEXT_PUBLIC_API_URL"
  ),

  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
};