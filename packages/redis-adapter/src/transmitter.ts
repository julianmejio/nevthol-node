import type { IGeoBroadcastTransmitter } from "@repo/broadcasting/geo-broadcast.js";
import type { IInitializable } from "@repo/core/lifecycle.js";
import { createClient } from "redis";
import {
  PlayerGeoPositionSchema,
  type PlayerPosition,
} from "@repo/contracts/player";

export interface RedisTransmitterParams {
  url: string;
}

export const createRedisTransmitter = (
  params: RedisTransmitterParams,
): IGeoBroadcastTransmitter & IInitializable => {
  const { url } = params;
  const redisPub = createClient({
    url,
    socket: {
      reconnectStrategy: (retries: number) => {
        return Math.min(retries * 100, 5000);
      },
      keepAlive: true,
    },
  });

  return {
    connect: async () => {
      await redisPub.connect();
    },
    disconnect: async () => {
      redisPub.destroy();
    },
    broadcastPosition: async (params: PlayerPosition) => {
      const paramsValidation = PlayerGeoPositionSchema.safeParse(params);
      if (!paramsValidation.success) {
        console.warn("Discarding one invalid message");
        return;
      }
      const paramsValidated = paramsValidation.data;
      await redisPub.publish(
        `mapGrid:${paramsValidated.channel}`,
        JSON.stringify(paramsValidated.position),
      );
    },
  };
};
