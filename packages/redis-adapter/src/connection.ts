import { createKeyValueStore } from "./hkv-store.js";
import type { IInitializable } from "@repo/core/lifecycle";
import type { IConnectionStore } from "@repo/session/connection";
import type { RedisAdapterParameters } from "./configuration.js";
import type { AuthenticationLevelEnum } from "@repo/contracts/api-gateway/authentication";

const redisConnectionNamespace = "connections";
const Fields = {
  CreationDate: "creation_date",
  AllowedCharacters: "allowed_characters",
  AuthenticationLevel: "authentication_level",
  CurrentCharacter: "current_character",
  PositionCount: "position_count",
} as const;

const createConnectionStore = (
  params: RedisAdapterParameters,
): IInitializable & IConnectionStore => {
  const client = createKeyValueStore(params.url);
  const getSessionHash = (connectionId: string) =>
    `${redisConnectionNamespace}:${connectionId}`;
  const setAllowedCharacters = async (
    connectionId: string,
    allowedCharacters: string[],
  ) => {
    await client.set(
      getSessionHash(connectionId),
      Fields.AllowedCharacters,
      allowedCharacters.join(","),
    );
  };
  const setup = async (
    connectionId: string,
    allowedCharacters: string[],
    authenticationLevel: AuthenticationLevelEnum,
  ) => {
    await client.setMultiple(getSessionHash(connectionId), {
      [Fields.AllowedCharacters]: allowedCharacters.join(","),
      [Fields.AuthenticationLevel]: authenticationLevel,
    });
  };
  return {
    connect: async () => client.connect(),
    disconnect: async () => client.disconnect(),
    setAllowedCharacters: setAllowedCharacters,
    setup: setup,
    getAllowedCharacters: async (connectionId: string) => {
      return (
        await client.get<string>(
          getSessionHash(connectionId),
          Fields.AllowedCharacters,
        )
      )?.split(",");
    },
    setCurrentCharacter: async (
      connectionId: string,
      currentCharacter: string,
    ) => {
      await client.set(
        getSessionHash(connectionId),
        Fields.CurrentCharacter,
        currentCharacter,
      );
    },
    getCurrentCharacter: async (connectionId: string) => {
      return await client.get<string | null>(
        getSessionHash(connectionId),
        Fields.CurrentCharacter,
      );
    },
    delete: async (connectionId: string) => {
      await client.deleteKey(getSessionHash(connectionId));
    },
    increasePositionCount: async (connectionId: string) => {
      return await client.incr(
        getSessionHash(connectionId),
        Fields.PositionCount,
      );
    },
    register: async (connectionId: string, ttl?: number) => {
      await client.set<number>(
        getSessionHash(connectionId),
        Fields.CreationDate,
        Math.floor(Date.now() / 1000),
      );
      if (!ttl) {
        return;
      }
      await client.expireKey(getSessionHash(connectionId), ttl);
    },
    persist: async (connectionId: string) => {
      await client.persistKey(getSessionHash(connectionId));
    },
    expire: async (connectionId: string, ttl: number) => {
      await client.expireKey(getSessionHash(connectionId), ttl);
    },
    keepAlive: async (connectionId: string, ttl: number) => {
      await client.expireKey(getSessionHash(connectionId), ttl);
    },
  };
};

export { createConnectionStore };
