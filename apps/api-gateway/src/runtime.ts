import { REDIS_URL, ELEVATION_SIGNATURE_KEY, JWT_PRIVATE_KEY } from "./config";
import { Layer, ManagedRuntime } from "effect";
import { RedisAdapterParameters } from "@repo/redis-adapter/configuration";
import {
  ElevationServiceConfig,
  ElevationServiceLive,
} from "@repo/authentication/elevation-service";
import {
  AuthenticationServiceConfig,
  AuthenticationServiceLive,
} from "@repo/authentication/authentication-service";
import { AccountApiLive } from "@repo/gw2api-adapter/account";
import { ElevationStoreLive } from "@repo/redis-adapter/elevation-store";

const RedisAdapterParametersLayer = Layer.succeed(RedisAdapterParameters, {
  url: REDIS_URL,
});

const ElevationServiceConfigLayer = Layer.succeed(ElevationServiceConfig, {
  ikm: Buffer.from(ELEVATION_SIGNATURE_KEY, "base64"),
});

const AuthenticationServiceConfigLayer = Layer.succeed(
  AuthenticationServiceConfig,
  {
    privateKey: JWT_PRIVATE_KEY,
  },
);

const ElevationStoreLayer = ElevationStoreLive.pipe(
  Layer.provideMerge(RedisAdapterParametersLayer),
);

const ElevationServiceLayer = ElevationServiceLive.pipe(
  Layer.provide(AccountApiLive),
  Layer.provide(ElevationStoreLayer),
  Layer.provide(ElevationServiceConfigLayer),
);

const AuthenticationServiceLayer = AuthenticationServiceLive.pipe(
  Layer.provide(AccountApiLive),
  Layer.provide(AuthenticationServiceConfigLayer),
);

export const ElevationServiceRuntime = ManagedRuntime.make(
  ElevationServiceLayer,
);

export const AuthenticationServiceRuntime = ManagedRuntime.make(
  AuthenticationServiceLayer,
);
