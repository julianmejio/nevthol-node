interface ITrailTracker {
  addDataPoint: (characterName: string, x: number, y: number) => Promise<void>;
}

export { type ITrailTracker };
