import { describe, expect, it } from "vitest";
import {
  calculateVelocity,
  type MapCoordinate,
} from "../../src/geo-coordinates";

describe("Geo coordinates", () => {
  it("should calculate the velocity of two points", () => {
    const p1: MapCoordinate = {
      x: 100,
      y: 100,
    };
    const p2: MapCoordinate = {
      x: 110,
      y: 110,
    };
    const timeSpan: number = 500;
    const { speed, direction } = calculateVelocity(p1, p2, timeSpan);
    expect(speed).toBeCloseTo(28.28, 2);
    expect(direction).toBe(45);
  });
});
