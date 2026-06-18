import uWS, {
  type TemplatedApp,
  type us_listen_socket,
  type WebSocket,
} from "uWebSockets.js";
import { PlayerPositionSchema } from "@repo/contracts/pb/broadcasting/v1/player_pb";
import { fromBinary } from "@bufbuild/protobuf";
import { createValidator } from "@bufbuild/protovalidate";
import type { IMessagePublisher } from "@repo/messaging/message-broker";
import {
  JWT_PUBLIC_KEY,
  LISTEN_PORT,
  MAX_BUFFERED_AMOUNT_PER_CONNECTION,
  MAX_PAYLOAD_LENGTH,
} from "./config";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { IConnectionStore } from "@repo/session/connection";
import type { AuthenticationAttributes } from "@repo/contracts/api-gateway/authentication";
import type { ITrailTracker } from "@repo/tracker/trail";
import type { IUserStore } from "@repo/session/user";

const validator = createValidator();
const connectionsServed = new Map<string, WebSocket<WebSocketUserData>>();

export interface ServerInstance {
  app: TemplatedApp;
  token: us_listen_socket;
  closeAllConnections: () => Promise<void>;
}

export interface ServerParams {
  listeningPort?: number;
  messenger: IMessagePublisher;
  store: IConnectionStore;
  tracker: ITrailTracker;
  userStore: IUserStore;
  maxPayloadLength?: number;
  maxBufferedAmountPerConnection?: number;
  topicName: string;
}

export interface WebSocketUserData {
  connectionId: string;
}

export const createServer = ({
  listeningPort = LISTEN_PORT,
  messenger,
  store,
  tracker,
  userStore,
  maxPayloadLength = MAX_PAYLOAD_LENGTH,
  maxBufferedAmountPerConnection = MAX_BUFFERED_AMOUNT_PER_CONNECTION,
  topicName,
}: ServerParams): Promise<ServerInstance> => {
  const closeAllConnections = async () => {
    try {
      const closePromises = Array.from(connectionsServed.keys()).map(
        async (key: string) => {
          const ws = connectionsServed.get(key);
          ws?.close();
          const currentCharacter = await store.getCurrentCharacter(key);
          await store.expire(key, 3600);
          if (null !== currentCharacter) {
            await Promise.all([
              tracker.removeCharacterPosition(currentCharacter as string),
              userStore.keepAlive(currentCharacter as string, 3600),
            ]);
          }
          connectionsServed.delete(key);
        },
      );
      await Promise.all(closePromises);
    } catch (error) {
      console.error(
        "Error occurred when tried to delete all the connections from the store",
        error,
      );
    }
  };
  const app = uWS.App().ws<WebSocketUserData>("/*", {
    compression: uWS.DISABLED,
    maxPayloadLength: maxPayloadLength,
    upgrade: (res, req, context) => {
      try {
        const websocketKey = req.getHeader("sec-websocket-key");
        const websocketProtocol = req.getHeader("sec-websocket-protocol");
        const websocketExtensions = req.getHeader("sec-websocket-extensions");
        const jwtToken = req.getHeader("authorization").replace("Bearer ", "");
        console.debug("Token", jwtToken);
        const jwtVerification = jwt.verify(
          jwtToken,
          JWT_PUBLIC_KEY,
        ) as JwtPayload & AuthenticationAttributes;
        const connectionId = jwtVerification["jti"] as string;
        const userData: WebSocketUserData = {
          connectionId: connectionId,
        };
        let aborted = false;
        res.onAborted(() => (aborted = true));
        store
          .setup(
            connectionId,
            jwtVerification["chl"].split(","),
            jwtVerification["aut"],
          )
          .then(() => {
            if (aborted) {
              store.delete(connectionId).then();
              return;
            }
            res.cork(() => {
              res.upgrade(
                userData,
                websocketKey,
                websocketProtocol,
                websocketExtensions,
                context,
              );
              console.debug("Connection upgraded", connectionId);
            });
          })
          .catch((err) => {
            console.error("Error in socket creation", err);
            store.delete(connectionId).then();
            res.cork(() => {
              res.writeStatus("500 Internal Server Error").end();
            });
          });
      } catch (error) {
        console.error("An error occurred when upgrading the connection", error);
        res.cork(() => {
          res.writeStatus("401 Unauthorized").end("Invalid connection");
        });
      }
    },
    open: (ws: WebSocket<WebSocketUserData>) => {
      const { connectionId } = ws.getUserData();
      connectionsServed.set(connectionId, ws);
      console.log("Client connected", connectionId);
    },
    message: (ws: WebSocket<WebSocketUserData>, message, isBinary) => {
      // Backpressure control: buffered amount of data
      if (ws.getBufferedAmount() > maxBufferedAmountPerConnection) {
        console.warn(
          "Max buffered amount limit per connection reached. Connection will be closed",
        );
        ws.close();
        return;
      }
      // Binary guard
      if (!isBinary) {
        console.warn("Message received is not binary");
        return;
      }
      try {
        const messagePayload = new Uint8Array(message);
        // Validate protobuf schema
        const validation = validator.validate(
          PlayerPositionSchema,
          fromBinary(PlayerPositionSchema, messagePayload),
        );
        if ("valid" != validation.kind) {
          console.error("Invalid message received", validation.violations);
          return;
        }
        const { connectionId } = ws.getUserData();
        // All fine, send message to Kafka
        const messageBuffer = Buffer.allocUnsafe(messagePayload.byteLength);
        messageBuffer.set(messagePayload);
        messenger
          .publish({
            topic: topicName,
            message: messageBuffer,
            key: connectionId,
          })
          .catch((err) => {
            console.error("[IMessagePublisher] Error caught:", err);
            ws.end(1011, "Error in messenger upstream");
          });
      } catch (error) {
        console.error("Error when trying to process a message", error);
        return;
      }
    },
    close: async (ws: WebSocket<WebSocketUserData>, code, message) => {
      try {
        const decoder = new TextDecoder("utf-8");
        const { connectionId } = ws.getUserData();
        const currentCharacter = await store.getCurrentCharacter(connectionId);
        if (null != currentCharacter) {
          await tracker.removeCharacterPosition(currentCharacter as string);
          await userStore.keepAlive(currentCharacter as string, 3600);
        }
        await store.expire(connectionId, 3600);
        console.log(
          `Client disconnected (${code}).`,
          connectionId,
          decoder.decode(message),
        );
        connectionsServed.delete(connectionId);
      } catch (error) {
        console.error("Error closing a connection", error);
        return;
      }
    },
  });
  return new Promise((resolve) => {
    app.listen(listeningPort, (token) => {
      resolve({ app, token, closeAllConnections });
    });
  });
};
