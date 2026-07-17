import { z } from "zod";
import { AppErrorCodeEnumSchema } from "../error.js";

const BaseApiResponseSchema = z.object({
  status: z.enum(["success", "error"]),
  message: z.string().optional(),
});
type BaseApiResponse = z.infer<typeof BaseApiResponseSchema>;

const BaseSuccessResponseSchema = BaseApiResponseSchema.extend({
  status: z.literal("success"),
});
type BaseSuccessResponse = z.infer<typeof BaseSuccessResponseSchema>;

const BaseErrorApiResponseSchema = BaseApiResponseSchema.extend({
  status: z.literal("error"),
  errorCode: AppErrorCodeEnumSchema,
});
type BaseErrorApiResponse = z.infer<typeof BaseErrorApiResponseSchema>;

export {
  BaseApiResponseSchema,
  BaseSuccessResponseSchema,
  BaseErrorApiResponseSchema,
  type BaseApiResponse,
  type BaseSuccessResponse,
  type BaseErrorApiResponse,
};
