import { z } from "zod";

/**
 * Error response schema from GW2.
 */
export const ErrorResponseSchema = z
  .object({
    /** Contains the reason of failure */
    text: z.string(),
  })
  .describe("Error from GW2");
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
