import type { IInitializable } from "@repo/core/lifecycle";
import { createClient } from "redis";

interface IStorableObject {
  [key: string]: string | number;
}

interface IHashKeyValueStore {
  get: <T>(key: string, field: string) => Promise<T | null>;
  set: <T extends string | number>(
    key: string,
    field: string,
    value: T,
    ttl?: number,
  ) => Promise<void>;
  setMultiple: (
    key: string,
    data: IStorableObject,
    ttl?: number,
  ) => Promise<void>;
  incr: (key: string, field: string, incr?: number) => Promise<number>;
  persistKey: (key: string) => Promise<void>;
  persistField: (key: string, field: string) => Promise<void>;
  expireKey: (key: string, ttl: number) => Promise<void>;
  expireField: (key: string, field: string, ttl: number) => Promise<void>;
  deleteKey: (key: string) => Promise<void>;
}

const createKeyValueStore = (
  url: string,
): IHashKeyValueStore & IInitializable => {
  const client = createClient({
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
      await client.connect();
    },
    disconnect: async () => {
      client.destroy();
    },
    get: async <T>(key: string, field: string) => {
      return (await client.hGet(key, field)) as T | null;
    },
    set: async <T extends string | number>(
      key: string,
      field: string,
      value: T,
      ttl?: number,
    ): Promise<void> => {
      await client.hSet(key, field, value);
      if (ttl) {
        await client.hExpire(key, field, ttl);
      }
    },
    setMultiple: async (key: string, data: IStorableObject, ttl?: number) => {
      await client.hSet(key, data);
      if (ttl) {
        await client.expire(key, ttl);
      }
    },
    persistKey: async (key: string) => {
      await client.persist(key);
    },
    persistField: async (key: string, field: string) => {
      await client.hPersist(key, field);
    },
    expireKey: async (key: string, ttl: number) => {
      await client.expire(key, ttl);
    },
    expireField: async (key: string, field: string, ttl: number) => {
      await client.hExpire(key, field, ttl);
    },
    incr: async (key: string, field: string, incr: number = 1) => {
      return await client.hIncrBy(key, field, incr);
    },
    deleteKey: async (key: string) => {
      await client.del(key);
    },
  };
};

export { createKeyValueStore, type IStorableObject };
