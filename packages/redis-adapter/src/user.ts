import type { IInitializable } from "@repo/core/lifecycle";
import type {
  IUserStore,
  UserAttributeCollection,
  UserAttributes,
} from "@repo/session/user";
import { createKeyValueStore } from "./hkv-store.js";

interface RedisUserStoreParams {
  url: string;
}

const createUserStore = (
  params: RedisUserStoreParams,
): IInitializable & IUserStore => {
  const keyValueStore = createKeyValueStore(params.url);
  const getUserHash = (characterName: string) => `users:${characterName}`;
  return {
    connect: async () => keyValueStore.connect(),
    disconnect: async () => keyValueStore.disconnect(),
    setAttribute: async <T extends string | number>(
      characterName: string,
      attribute: keyof typeof UserAttributes,
      value: T,
    ) => {
      await keyValueStore.set<T>(
        getUserHash(characterName),
        attribute,
        value,
        300,
      );
    },
    setAttributes: async (
      characterName: string,
      data: Partial<UserAttributeCollection>,
    ) => {
      await keyValueStore.setMultiple(getUserHash(characterName), data, 120);
    },
    getAttribute: async <T extends string | number>(
      characterName: string,
      attribute: keyof typeof UserAttributes,
    ) => {
      return await keyValueStore.get<T>(getUserHash(characterName), attribute);
    },
    keepAlive: async (characterName: string, ttl: number) => {
      await keyValueStore.expireKey(getUserHash(characterName), ttl);
    },
    deleteUser: async (characterName: string) => {
      await keyValueStore.deleteKey(getUserHash(characterName));
    },
  };
};

export { type RedisUserStoreParams, createUserStore };
