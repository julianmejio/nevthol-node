import { createKafkaConsumer } from "@repo/kafka-adapter/node-rdkafka";
import { fromBinary } from "@bufbuild/protobuf";
import {
  type PlayerPosition,
  PlayerPositionSchema,
} from "@repo/contracts/pb/broadcasting/v1/player_pb";
import { createValidator } from "@bufbuild/protovalidate";
import { getGridRoom } from "@repo/core/geo-coordinates";
import { createRedisTransmitter } from "@repo/redis-adapter/transmitter";
import { createConnectionStore } from "@repo/redis-adapter/connection";
import {
  AUTO_OFFSET_RESET,
  CONNECTION_STORE_TTL,
  ENABLE_AUTO_COMMIT,
  FETCH_MESSAGE_MAX_BYTES,
  FETCH_MIN_BYTES,
  FETCH_WAIT_MAX_MS,
  GROUP_ID,
  MESSENGER_BROKER,
  QUEUED_MIN_MESSAGES,
  STATE_STORE_URL,
  TRAIL_MAX_STORE_POINTS,
  TRAIL_MAX_STORE_TIME_MS,
} from "./config.js";
import {
  type PlayerPosition as BroadcastPlayerPosition,
  PlayerPositionFlags,
} from "@repo/contracts/player";
import { createUserStore } from "@repo/redis-adapter/user";
import { has } from "@repo/core/bitmask";
import { createRedisTrailTracker } from "@repo/redis-adapter/trail";
import { type RedisAdapterParameters } from "@repo/redis-adapter/configuration";

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

const redisParameters: RedisAdapterParameters = {
  url: STATE_STORE_URL,
};

const transmitter = createRedisTransmitter(redisParameters);
const connectionStore = createConnectionStore(redisParameters);
const userStore = createUserStore(redisParameters);
const tracker = createRedisTrailTracker({
  ...redisParameters,
  TrailStoreMaxPoints: TRAIL_MAX_STORE_POINTS,
  TrailStoreMaxTimeMs: TRAIL_MAX_STORE_TIME_MS,
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
await connectionStore.connect();
await userStore.connect();
await tracker.connect();
await consumer.subscribe({
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
      const allowedNames = (await connectionStore.getAllowedCharacters(
        key,
      )) as unknown;
      if (
        !Array.isArray(allowedNames) ||
        !allowedNames.includes(characterName)
      ) {
        console.error(`${characterName} cannot broadcast on channel ${key}`);
        return;
      }
      playerConnections.set(key, characterName);
      await connectionStore.setCurrentCharacter(key, characterName);
      await userStore.deleteUser(String(playerName));
      await tracker.removeCharacterPosition(String(playerName));
      console.debug(`${characterName} is now broadcasting on channel ${key}`);
    }
    if (null === playerName && undefined === characterName) {
      console.warn(`No character broadcasting in ${key}`);
      return;
    }
    const effectiveName = characterName || playerName;
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
    await connectionStore.increasePositionCount(key);
    if (CONNECTION_STORE_TTL) {
      await connectionStore.expire(key, CONNECTION_STORE_TTL);
    }
    if (playerConnections.get(key) !== position.position.l) {
      return;
    }
    await userStore.setAttributes(position.position.l, {
      X: position.position.x,
      Y: position.position.y,
      Z: position.position.z || 0,
      InCombat: has({
        mask: position.position.f,
        flag: PlayerPositionFlags.IN_COMBAT,
      })
        ? 1
        : 0,
      Commander: has({
        mask: position.position.f,
        flag: PlayerPositionFlags.IS_COMMANDER,
      })
        ? 1
        : 0,
      MapId: position.position.m || "",
      MountId: position.position.n || 0,
      ProfessionId: position.position.p || 0,
      RaceId: position.position.r || 0,
      SpecializationId: position.position.s || 0,
      LastUpdated: Date.now().toString(),
      Connection: key,
    });
    await tracker.addDataPoint(
      position.position.l,
      position.position.x,
      position.position.y,
    );
  },
});
