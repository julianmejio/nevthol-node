interface ITrailTracker {
  addDataPoint: (characterName: string, x: number, y: number) => Promise<void>;
  removeCharacterPosition: (characterName: string) => Promise<void>;
}

export { type ITrailTracker };
