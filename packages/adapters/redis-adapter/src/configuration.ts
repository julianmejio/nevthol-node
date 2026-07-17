import { Context } from "effect";
export interface RedisAdapterParameters {
  readonly url: string;
}
export const RedisAdapterParameters =
  Context.GenericTag<RedisAdapterParameters>("RedisAdapterParameters");
