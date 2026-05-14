import { describe, expect, it } from "vitest";
import { has, set, toggle, unset } from "../../src/bitmask";

describe("bitflag", () => {
  it("should set a flag", () => {
    const mask = 0b0101;
    const flag = 0b0010;

    const maskResult = set({ mask, flag });

    expect(maskResult).toBe(0b111);
  });

  it("should unset a flag", () => {
    const mask = 0b1011;
    const flag = 0b0010;

    const maskResult = unset({ mask, flag });

    expect(maskResult).toBe(0b1001);
  });

  it("should toggle a flag", () => {
    const mask = 0b0101;
    const flag = 0b0001;

    const maskResult = toggle({ mask, flag });

    expect(maskResult).toBe(0b0100);
  });

  it("should has a flag", () => {
    const mask = 0b11010;
    const flagExistent = 0b01000;
    const flagNotExistent = 0b00100;

    const maskResultExistent = has({ mask, flag: flagExistent });
    const maskResultNotExistent = has({ mask, flag: flagNotExistent });

    expect(maskResultExistent).toBe(true);
    expect(maskResultNotExistent).toBe(false);
  });
});
