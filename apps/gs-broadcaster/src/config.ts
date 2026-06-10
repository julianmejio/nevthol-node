import { z } from "zod";

const ConfigSchema = z.object({
  LISTEN_PORT: z.coerce.number().positive().default(3001),
  MESSENGER_BROKER: z.string().default("localhost:9092"),
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
});

const parseEnv = ConfigSchema.parse(process.env);

export const {
  LISTEN_PORT,
  MESSENGER_BROKER,
  GROUP_ID,
  FETCH_MIN_BYTES,
  FETCH_WAIT_MAX_MS,
  FETCH_MESSAGE_MAX_BYTES,
  ENABLE_AUTO_COMMIT,
  QUEUED_MIN_MESSAGES,
  AUTO_OFFSET_RESET,
} = parseEnv;
