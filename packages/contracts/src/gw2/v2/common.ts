import { z } from "zod";

/**
 * Error response schema from GW2.
 */
export const Gw2ApiErrorResponseSchema = z
  .object({
    /** Contains the reason of failure */
    text: z.string(),
  })
  .describe("Error from GW2");
