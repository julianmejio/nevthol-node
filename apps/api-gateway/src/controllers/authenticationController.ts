import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import {
  PostAuthenticateRequestSchema,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import { Gw2ApiTokenInfoSchema } from "@repo/contracts/gw2/v2";
import { createAccountClient } from "@repo/gw2api-adapter/account";
import { type AppError, AppErrorCode } from "@repo/contracts/error";
import { JWT_PRIVATE_KEY } from "../config";

export const authenticate = async (
  req: Request,
  res: Response<PostAuthenticateResponse | AppError>,
  _next: NextFunction,
) => {
  // Validate input
  const credentialParsed = PostAuthenticateRequestSchema.safeParse(req.body);
  if (!credentialParsed.success) {
    return res.status(401).send({
      errorCode: AppErrorCode.UNKNOWN,
      message: credentialParsed.error.message,
    });
  }

  // Create Account API client
  const accountClient = createAccountClient();
  accountClient.authenticate(credentialParsed.data.gw2token);

  try {
    // Retrieve token info
    const tokenInfoResponse = await accountClient.getTokenInfo();
    // Validate token information
    const tokenInfoParsed = Gw2ApiTokenInfoSchema.safeParse(tokenInfoResponse);
    if (!tokenInfoParsed.success) {
      return res.status(401).send({
        errorCode: AppErrorCode.AUTHENTICATION_INVALID_AUTHENTICATION,
        message: tokenInfoParsed.error.message,
      });
    }
    const characters = await accountClient.getAllCharacters();
    if (!Array.isArray(characters)) {
      return res.status(401).send({
        errorCode: AppErrorCode.GW2_ACCOUNT_INVALID_CHARACTER_LIST,
        message: "List of GW2 characters is invalid",
      });
    }
    // Sign JWT token
    const jwtToken = jwt.sign({ chl: characters.join(",") }, JWT_PRIVATE_KEY, {
      algorithm: "ES256",
      expiresIn: "15s",
      notBefore: 0,
      audience: "geo-transponder",
      issuer: "api-gateway",
      jwtid: nanoid(10),
      subject: "badge",
    });

    // Return to client
    return res.status(200).send({
      status: "success",
      token: jwtToken,
    });
  } catch (error) {
    return res.status(401).send({
      errorCode: AppErrorCode.AUTHENTICATION_GENERIC_ERROR,
      message: "Could not authenticate",
    });
  }
};
