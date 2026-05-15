import { z } from "zod";

const DEFAULT_MAX_PAYLOAD_LENGTH = 2 * 1024;

// Define env schema required for the app
const ConfigSchema = z.object({
  LISTEN_PORT: z.coerce.number().positive().default(9001),
  MESSENGER_BROKER: z.string().default("localhost:9092"),
  MAX_PAYLOAD_LENGTH: z.coerce
    .number()
    .positive()
    .default(DEFAULT_MAX_PAYLOAD_LENGTH),
  MAX_BUFFERED_AMOUNT_PER_CONNECTION: z.coerce
    .number()
    .positive()
    .default(2 * DEFAULT_MAX_PAYLOAD_LENGTH),
});

// Validate the env variables. We use parse bedause we want it fails if no
// env variables valid for startup.
const parseEnv = ConfigSchema.parse(process.env);

export const {
  LISTEN_PORT,
  MESSENGER_BROKER,
  MAX_PAYLOAD_LENGTH,
  MAX_BUFFERED_AMOUNT_PER_CONNECTION,
} = parseEnv;
