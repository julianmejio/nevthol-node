import { z } from "zod";

export const PlayerGeoPositionSchema = z.object({
  channel: z.string().regex(/^(\d+_){2}\d{1,3}$/),
  position: z.object({
    playerName: z.string(),
    x: z.number().gte(0).max(81920),
    y: z.number().gte(0).max(114688),
  }),
});

export type PlayerPosition = z.infer<typeof PlayerGeoPositionSchema>;
