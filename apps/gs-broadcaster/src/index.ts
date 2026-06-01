import { createKafkaConsumer } from "@repo/kafka-adapter/node-rdkafka";
import { fromBinary } from "@bufbuild/protobuf";
import {
  type PlayerPosition,
  PlayerPositionSchema,
} from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
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
import type { PlayerPosition as BroadcastPlayerPosition } from "@repo/contracts/player";

const playerConnections = new Map<string, string>();
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

const optionalPositionFieldsMap: Partial<
  Record<keyof PlayerPosition, keyof BroadcastPlayerPosition["position"]>
> = {
  z: "z",
  mapId: "m",
  mountId: "n",
  professionId: "p",
  raceId: "r",
  specializationId: "s",
};

await consumer.connect();
await transmitter.connect();
consumer.subscribe({
  topic: "player-position-v1",
  onmessage: async ({ key, contents }) => {
    const messageDecoded = fromBinary(PlayerPositionSchema, contents);
    const validationResult = validator.validate(
      PlayerPositionSchema,
      messageDecoded,
    );
    if (validationResult.error) {
      console.warn("Message is invalid");
      return;
    }
    if (!key) {
      console.error("No connection found for the message");
      return;
    }
    const { x, y, flags, characterName } = messageDecoded;
    const playerName =
      (playerConnections.has(key) && playerConnections.get(key)) || null;
    if (characterName && playerName !== characterName) {
      playerConnections.set(key, characterName);
      console.debug(`Connection ${key} is now known as ${characterName}`);
    }
    if (null === playerName && undefined === characterName) {
      console.warn(`Connection ${key} has not been properly identified`);
      return;
    }
    const effectiveName = playerName || characterName;
    const position: BroadcastPlayerPosition = {
      channel: getGridRoom({ x, y, gridSize: 500 }),
      position: {
        l: String(effectiveName),
        x,
        y,
        f: flags,
      },
    };
    for (const [key, target] of Object.entries(optionalPositionFieldsMap) as [
      keyof PlayerPosition,
      keyof BroadcastPlayerPosition["position"],
    ][]) {
      const value = messageDecoded[key];
      if (value !== undefined && value !== null) {
        (position["position"] as Record<string, unknown>)[target] = value;
      }
    }
    await transmitter.broadcastPosition(position);
  },
});
