import { createKafkaConsumer } from "@repo/kafka-adapter/node-rdkafka";
import { fromBinary } from "@bufbuild/protobuf";
import { PlayerPositionSchema } from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
import { createValidator } from "@bufbuild/protovalidate";
import { getGridRoom } from "@repo/utils/coordinates";
import { createRedisTransmitter } from "@repo/redis-adapter";
import {
  AUTO_OFFSET_RESET,
  ENABLE_AUTO_COMMIT,
  FETCH_MESSAGE_MAX_BYTES,
  FETCH_MIN_BYTES,
  FETCH_WAIT_MAX_MS,
  GROUP_ID,
  MESSENGER_BROKER,
  QUEUED_MIN_MESSAGES,
} from "./config.js";
const validator = createValidator();

const consumer = createKafkaConsumer({
  brokers: [MESSENGER_BROKER],
  groupId: GROUP_ID,
  fetchMinBytes: FETCH_MIN_BYTES,
  fetchWaitMaxMs: FETCH_WAIT_MAX_MS,
  fetchMessageMaxBytes: FETCH_MESSAGE_MAX_BYTES,
  enableAutoCommit: ENABLE_AUTO_COMMIT,
  queuedMinMessages: QUEUED_MIN_MESSAGES,
  autoOffsetReset: AUTO_OFFSET_RESET,
});

const transmitter = createRedisTransmitter({
  url: "redis://default@localhost:6379",
});

await consumer.connect();
await transmitter.connect();
consumer.subscribe({
  topic: "player-position-v1",
  onmessage: async (message, headers) => {
    const messageDecoded = fromBinary(PlayerPositionSchema, message);
    const validationResult = validator.validate(
      PlayerPositionSchema,
      messageDecoded,
    );
    if (validationResult.error) {
      console.warn("Message is invalid");
      return;
    }

    const headersFormat = headers as unknown as {
      [key: string]: Buffer | string;
    }[];
    const headerMap = new Map<string, string | Buffer>();
    for (const header of headersFormat) {
      const key = Object.keys(header)[0];
      const value = header[key];
      headerMap.set(key, value);
    }

    const player = headerMap.get("player");
    const playerFormatted: string =
      undefined === player
        ? "Anonymous"
        : player instanceof Uint8Array
          ? player.toString()
          : player;

    const { x, y } = messageDecoded;
    await transmitter.broadcastPosition({
      channel: getGridRoom({ x, y, gridSize: 2000 }),
      position: {
        playerName: playerFormatted,
        x: x,
        y: y,
      },
    });
  },
});
