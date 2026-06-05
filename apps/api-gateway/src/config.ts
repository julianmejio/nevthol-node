import { z } from "zod";

const ConfigSchema = z.object({
  JWT_PRIVATE_KEY: z.string(),
});

const parseEnv = ConfigSchema.parse(process.env);

export const { JWT_PRIVATE_KEY } = parseEnv;
