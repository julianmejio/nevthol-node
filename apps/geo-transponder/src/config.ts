import { z } from "zod";

// Define env schema required for the app
const ConfigSchema = z.object({
  LISTEN_PORT: z.coerce.number().positive().default(9001),
});

// Validate the env variables. We use parse bedause we want it fails if no
// env variables valid for startup.
const parseEnv = ConfigSchema.parse(process.env);

export const { LISTEN_PORT } = parseEnv;
