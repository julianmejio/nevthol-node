import type { IInitializable } from "@repo/core/lifecycle";
import type { ICharacterTracker } from "@repo/tracker/tracker";
import { tyriaToLatLng } from "@repo/core/geo-coordinates";
import { createClient } from "redis";

interface RedisTrackerParams {
  url: string;
}

const getTrailHash = (characterId: string) => `track:${characterId}`;

const createRedisTracker = (
  params: RedisTrackerParams,
): IInitializable & ICharacterTracker => {
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
      const buffer = Buffer.alloc(6);
      buffer.writeUIntBE(x, 0, 3);
      buffer.writeUIntBE(y, 3, 3);
      const timeSpan = timestamp - 8 * 60 * 60 * 1000;
      const converted = tyriaToLatLng(x, y);
      await client
        .multi()
        .geoAdd("tracking:positions", {
          member: characterName,
          longitude: converted.lng,
          latitude: converted.lat,
        })
        .zAdd(getTrailHash(characterName), {
          score: timestamp,
          value: buffer,
        })
        .expire(getTrailHash(characterName), 86400)
        .zRemRangeByRank(getTrailHash(characterName), 0, -(20000 + 1))
        .zRemRangeByScore(getTrailHash(characterName), 0, timeSpan)
        .exec();
    },
  };
};

export { type RedisTrackerParams, createRedisTracker };
