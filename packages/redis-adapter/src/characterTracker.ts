import type { IInitializable } from "@repo/core/lifecycle.js";
import type { ICharacterTracker } from "@repo/tracker/tracker";
import { createClient } from "redis";

interface RedisTrackerParams {
  url: string;
}

// Define your grid constraints
const MAX_X = 81920;
const MAX_Y = 114688;

/**
 * Converts your custom grid X/Y to fake Earth Long/Lat
 */
function gridToGeo(x: number, y: number) {
  // 1. Get percentage of your grid (0.0 to 1.0)
  const pctX = x / MAX_X;
  const pctY = y / MAX_Y;

  // 2. Map X to Longitude (-180 to 180) -> Span of 360
  const lng = -180 + pctX * 360;

  // 3. Map Y to Latitude (-80 to 80) -> Span of 160 (Safely inside 85 limit)
  const lat = -80 + pctY * 160;

  return { lng, lat };
}

// /**
//  * Converts the fake Earth Long/Lat back into your grid X/Y
//  */
// function geoToGrid(lng: number, lat: number) {
//   const pctX = (lng + 180) / 360;
//   const pctY = (lat + 80) / 160;
//
//   const x = Math.round(pctX * MAX_X);
//   const y = Math.round(pctY * MAX_Y);
//
//   return { x, y };
// }

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
      const converted = gridToGeo(x, y);
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
