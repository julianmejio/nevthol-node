export interface IInitializable {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}
