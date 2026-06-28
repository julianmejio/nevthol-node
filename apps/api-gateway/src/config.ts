import { z } from "zod";

const ConfigSchema = z.object({
  LISTEN_PORT: z.coerce.number().default(3002),
  JWT_PRIVATE_KEY: z.string(),
  ELEVATION_SIGNATURE_KEY: z.base64(),
  REDIS_URL: z.string(),
});

const parseEnv = ConfigSchema.parse(process.env);

export const {
  LISTEN_PORT,
  JWT_PRIVATE_KEY,
  ELEVATION_SIGNATURE_KEY,
  REDIS_URL,
} = parseEnv;
