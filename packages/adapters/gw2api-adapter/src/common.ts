import { z } from "zod";
import {
  type AppError,
  type AppErrorCodeEnum,
  ErrorCode,
} from "@repo/contracts/error";

/**
 * API base URL for version 2.
 */
const apiBaseUrl = "https://api.guildwars2.com/v2";

const Endpoint = {
  TokenInfo: "/tokeninfo",
  Characters: "/characters",
  Account: "/account",
} as const;

const TokenInfoParameterSchema = z.object({
  endpoint: z.literal(Endpoint.TokenInfo),
  parameters: z.null().default(null),
});

const CharactersParametersSchema = z.object({
  endpoint: z.literal(Endpoint.Characters),
  parameters: z.null().default(null),
});

const AccountParametersSchema = z.object({
  endpoint: z.literal(Endpoint.Account),
  parameters: z.null().default(null),
});

export const EndpointParametersSchema = z.discriminatedUnion("endpoint", [
  TokenInfoParameterSchema,
  CharactersParametersSchema,
  AccountParametersSchema,
]);

type EndpointParameters = z.infer<typeof EndpointParametersSchema>;

const getEndpoint = (params: EndpointParameters): string =>
  `${apiBaseUrl}${
    (null !== params.parameters &&
      Object.keys(params.parameters).reduce((acc: string, val: string) => {
        const key = val as keyof typeof params.parameters;
        return (
          (null !== params.parameters &&
            acc.replace(`:${val}`, String(params.parameters[key]))) ||
          acc
        );
      }, params.endpoint)) ||
    params.endpoint
  }`;

interface fetchApiParams {
  endpointConfiguration: EndpointParameters;
  authorizationToken?: string;
  gw2ErrorCode?: AppErrorCodeEnum;
}

const fetchApi = async <T>(params: fetchApiParams): Promise<T | AppError> => {
  const uri = getEndpoint(params.endpointConfiguration);

  const response = await fetch(uri, {
    headers: {
      Authorization: `Bearer ${params.authorizationToken}`,
    },
  });
  if (!response.ok) {
    const responseText = await response.text();
    console.error("Error in fetchApi", responseText);

    return {
      errorCode: params.gw2ErrorCode || ErrorCode.ERROR_GW2_UPSTREAM_OTHER,
      message: response.statusText,
    };
  }
  return (await response.json()) as T;
};

export { apiBaseUrl, Endpoint, getEndpoint, fetchApi };
