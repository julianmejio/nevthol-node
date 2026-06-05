import { z } from "zod";

/**
 * Flags that can be assigned to a position of a player.
 */
export const PlayerPositionFlags = {
  NONE: 0,
  IN_COMBAT: 1 << 0,
  IS_COMMANDER: 1 << 1,
};

/**
 * Valid flags. It sets all the possible bits in the flag's byte.
 */
const validPlayerPositionFlags = Object.values(PlayerPositionFlags).reduce(
  (acc, val) => acc | val,
  0,
);

/**
 * Schema that describes a valid position description of a player.
 */
export const PlayerGeoPositionSchema = z.object({
  channel: z.string().regex(/^(\d+_){2}\d{1,3}$/),
  position: z.object({
    l: z
      .string()
      .describe("Character name (not account name) that belongs this position"),
    x: z.number().nonnegative().max(81920).describe("X position"),
    y: z.number().nonnegative().max(114688).describe("Y position"),
    z: z.number().optional().describe("Z position"),
    f: z
      .number()
      .nonnegative()
      .optional()
      .default(PlayerPositionFlags.NONE)
      .refine((val) => (val & ~validPlayerPositionFlags) === 0)
      .describe("Position flags"),
    m: z.number().nonnegative().optional().describe("Map ID"),
    n: z.number().nonnegative().optional().describe("Mount ID"),
    p: z.number().nonnegative().optional().describe("Profession ID"),
    r: z.number().nonnegative().optional().describe("Race ID"),
    s: z.number().nonnegative().optional().describe("Specialization ID"),
  }),
});

/**
 * Schema that describes a valid position description of a player.
 */
export type PlayerPosition = z.infer<typeof PlayerGeoPositionSchema>;
