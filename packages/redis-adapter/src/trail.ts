import type { IInitializable } from "@repo/core/lifecycle";
import type { ITrailTracker } from "@repo/tracker/trail";
import { tyriaToLatLng, packCoordinates } from "@repo/core/geo-coordinates";
import { createClient } from "redis";
import { type RedisAdapterParameters } from "./configuration.js";
import { getNamespace } from "./common.js";

interface RedisTrailTrackerParameters {
  TrailStoreMaxPoints: number;
  TrailStoreMaxTimeMs: number;
}

const REDIS_NAMESPACE_TRACKING_USERS = "tracking:users";
const REDIS_NAMESPACE_TRACKING_POSITIONS = "tracking:positions";

const createRedisTrailTracker = (
  params: RedisAdapterParameters & RedisTrailTrackerParameters,
): IInitializable & ITrailTracker => {
  const client = createClient({
    url: params.url,
    socket: {
      reconnectStrategy: (retries: number) => {
        return Math.min(retries * 100, 5000);
      },
      keepAlive: true,
    },
  });
  return {
    connect: async () => {
      await client.connect();
    },
    disconnect: async () => {
      client.destroy();
    },
    addDataPoint: async (characterName: string, x: number, y: number) => {
      const timestamp = Date.now();
      const packedCoordinates = packCoordinates({ x, y });
      const maxTimeSpan = timestamp - params.TrailStoreMaxTimeMs;
      const converted = tyriaToLatLng(x, y);
      await client
        .multi()
        .geoAdd(REDIS_NAMESPACE_TRACKING_POSITIONS, {
          member: characterName,
          longitude: converted.lng,
          latitude: converted.lat,
        })
        .zAdd(getNamespace(REDIS_NAMESPACE_TRACKING_USERS, characterName), {
          score: timestamp,
          value: packedCoordinates,
        })
        .expire(
          getNamespace(REDIS_NAMESPACE_TRACKING_USERS, characterName),
          86400,
        )
        .zRemRangeByRank(
          getNamespace(REDIS_NAMESPACE_TRACKING_USERS, characterName),
          0,
          -(params.TrailStoreMaxPoints + 1),
        )
        .zRemRangeByScore(
          getNamespace(REDIS_NAMESPACE_TRACKING_USERS, characterName),
          0,
          maxTimeSpan,
        )
        .exec();
    },
    removeCharacterPosition: async (characterName: string) => {
      await client.zRem(REDIS_NAMESPACE_TRACKING_POSITIONS, characterName);
    },
  };
};

export { createRedisTrailTracker, type RedisTrailTrackerParameters };
