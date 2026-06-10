interface IConnectionStore {
  register: (connectionId: string, ttl?: number) => Promise<void>;
  persist: (connectionId: string) => Promise<void>;
  expire: (connectionId: string, ttl: number) => Promise<void>;
  keepAlive: (connectionId: string, ttl: number) => Promise<void>;
  setAllowedCharacters: (
    connectionId: string,
    allowedCharacters: string[],
  ) => Promise<void>;
  getAllowedCharacters: (connectionId: string) => Promise<string[] | undefined>;
  setCurrentCharacter: (
    connectionId: string,
    currentCharacter: string,
  ) => Promise<void>;
  getCurrentCharacter: (connectionId: string) => Promise<string | null>;
  increasePositionCount: (connectionId: string) => Promise<number>;
  delete: (connectionId: string) => Promise<void>;
}

export { type IConnectionStore };
