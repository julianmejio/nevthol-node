import uWS, {
  type TemplatedApp,
  type us_listen_socket,
  type WebSocket,
} from "uWebSockets.js";
import { PlayerPositionSchema } from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
import { fromBinary } from "@bufbuild/protobuf";
import { createValidator } from "@bufbuild/protovalidate";
import type { IMessagePublisher } from "@repo/messaging/message-broker.js";
import {
  LISTEN_PORT,
  MAX_BUFFERED_AMOUNT_PER_CONNECTION,
  MAX_PAYLOAD_LENGTH,
} from "./config";

const validator = createValidator();

export interface ServerInstance {
  app: TemplatedApp;
  token: us_listen_socket;
}

export interface ServerParams {
  listeningPort?: number;
  messenger: IMessagePublisher;
  maxPayloadLength?: number;
  maxBufferedAmountPerConnection?: number;
  topicName: string;
}

export const createServer = ({
  listeningPort = LISTEN_PORT,
  messenger,
  maxPayloadLength = MAX_PAYLOAD_LENGTH,
  maxBufferedAmountPerConnection = MAX_BUFFERED_AMOUNT_PER_CONNECTION,
  topicName,
}: ServerParams): Promise<ServerInstance> => {
  const app = uWS.App().ws("/*", {
    compression: uWS.DISABLED,
    maxPayloadLength: maxPayloadLength,
    message: (ws: WebSocket<never>, message, isBinary) => {
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
        // All fine, send message to Kafka
        messenger
          .publish({ topic: topicName, message: Buffer.from(messagePayload) })
          .catch((err) => {
            console.error("[IMessagePublisher] Error caught:", err);
            ws.end(1011, "Error in messenger upstream");
          });
      } catch (error) {
        console.error("Error when trying to process a message", error);
        return;
      }
    },
    close: (_ws: WebSocket<never>, code, message) => {
      const decoder = new TextDecoder("utf-8");
      console.log(`Client disconnected (${code}).`, decoder.decode(message));
    },
  });
  return new Promise((resolve) => {
    app.listen(listeningPort, (token) => {
      resolve({ app, token });
    });
  });
};
