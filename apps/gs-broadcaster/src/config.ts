import { z } from "zod";

const ConfigSchema = z.object({
  LISTEN_PORT: z.coerce.number().positive().default(3001),
  MESSENGER_BROKER: z.string().default("localhost:9092"),
  STATE_STORE_URL: z.string().default("redis://default@localhost:6379"),
  CONNECTION_STORE_TTL: z.coerce.number().positive().optional(),
  GROUP_ID: z.string().default("broadcaster-consumer"),
  FETCH_MIN_BYTES: z.coerce
    .number()
    .positive()
    .default(1024 * 64),
  FETCH_WAIT_MAX_MS: z.coerce.number().positive().default(50),
  FETCH_MESSAGE_MAX_BYTES: z.coerce
    .number()
    .positive()
    .default(1024 * 1024 * 10),
  ENABLE_AUTO_COMMIT: z.coerce.boolean().default(false),
  QUEUED_MIN_MESSAGES: z.coerce.number().positive().default(500000),
  AUTO_OFFSET_RESET: z.enum(["latest", "beginning"]).default("latest"),
  TRAIL_MAX_STORE_POINTS: z.coerce.number().positive().default(50000),
  TRAIL_MAX_STORE_TIME_MS: z.coerce
    .number()
    .positive()
    .default(8 * 60 * 60 * 1000),
});

const parseEnv = ConfigSchema.parse(process.env);

export const {
  LISTEN_PORT,
  MESSENGER_BROKER,
  STATE_STORE_URL,
  CONNECTION_STORE_TTL,
  GROUP_ID,
  FETCH_MIN_BYTES,
  FETCH_WAIT_MAX_MS,
  FETCH_MESSAGE_MAX_BYTES,
  ENABLE_AUTO_COMMIT,
  QUEUED_MIN_MESSAGES,
  AUTO_OFFSET_RESET,
  TRAIL_MAX_STORE_POINTS,
  TRAIL_MAX_STORE_TIME_MS,
} = parseEnv;
