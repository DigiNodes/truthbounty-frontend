import { envSchema } from "../config/env.validation";

describe("Environment Validation", () => {
  it("should pass with valid env", () => {
    const { error } = envSchema.validate({
      NODE_ENV: "development",
      PORT: 3000,
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      JWT_SECRET: "supersecretkeywith32charsminimum",
      RELAYER_KEY: "0xabc",
      RPC_URL: "http://localhost:8545",
    });
    expect(error).toBeUndefined();
  });

  it("should fail with missing env", () => {
    const { error } = envSchema.validate({});
    expect(error).toBeDefined();
    expect(error?.details[0].message).toContain("NODE_ENV");
  });
});
