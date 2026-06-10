const UserAttributes = {
  X: "x",
  Y: "y",
  Z: "z",
  InCombat: "in_combat",
  Commander: "commander",
  MapId: "map_id",
  MountId: "mount_id",
  ProfessionId: "profession_id",
  RaceId: "race_id",
  SpecializationId: "specialization_id",
  LastUpdated: "last_updated",
  Connection: "connection",
} as const;

type UserAttributeCollection = {
  [key in keyof typeof UserAttributes]: string | number;
};

interface IUserStore {
  setAttribute: <T extends string | number>(
    characterName: string,
    attribute: keyof typeof UserAttributes,
    value: T,
  ) => Promise<void>;
  getAttribute: <T extends string | number>(
    characterName: string,
    attribute: keyof typeof UserAttributes,
  ) => Promise<T | null>;
  setAttributes: (
    characterName: string,
    data: Partial<UserAttributeCollection>,
  ) => Promise<void>;
  keepAlive: (characterName: string, ttl: number) => Promise<void>;
  deleteUser: (characterName: string) => Promise<void>;
}

export type { IUserStore, UserAttributes, UserAttributeCollection };
