import * as Joi from "joi";

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  RELAYER_KEY: Joi.string().required(),
  RPC_URL: Joi.string().uri().required(),
}).unknown(true); // allow extra vars
