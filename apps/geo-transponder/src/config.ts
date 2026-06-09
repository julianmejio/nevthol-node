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
  QUEUE_BUFFERING_MAX_MESSAGES: z.coerce.number().positive().default(1000000),
  QUEUE_BUFFERING_MAX_MS: z.coerce.number().positive().default(50),
  BATCH_NUM_MESSAGES: z.coerce.number().positive().default(10000),
  COMPRESSION_CODEC: z.enum(["none"]).default("none"),
  REQUEST_REQUIRED_ACKS: z.coerce.number().positive().default(1),
  EVENT_CB: z.boolean().default(true),
  JWT_PUBLIC_KEY: z.string(),
});

// Validate the env variables. We use parse bedause we want it fails if no
// env variables valid for startup.
const parseEnv = ConfigSchema.parse(process.env);

export const {
  LISTEN_PORT,
  MESSENGER_BROKER,
  MAX_PAYLOAD_LENGTH,
  MAX_BUFFERED_AMOUNT_PER_CONNECTION,
  QUEUE_BUFFERING_MAX_MESSAGES,
  QUEUE_BUFFERING_MAX_MS,
  BATCH_NUM_MESSAGES,
  COMPRESSION_CODEC,
  REQUEST_REQUIRED_ACKS,
  EVENT_CB,
  JWT_PUBLIC_KEY,
} = parseEnv;
