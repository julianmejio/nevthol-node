import uWS, {
  type TemplatedApp,
  type us_listen_socket,
  type WebSocket,
} from "uWebSockets.js";
import { PlayerPositionSchema } from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
import { fromBinary } from "@bufbuild/protobuf";
import { createValidator } from "@bufbuild/protovalidate";
import type { MessagingProvider } from "./kafka";

const validator = createValidator();

const MAX_PAYLOAD_LENGTH = 2 * 1024;
const MAX_BUFFERED_AMOUNT_PER_CONNECTION = MAX_PAYLOAD_LENGTH * 20;
const KAFKA_TOPIC = "player-position-v1";

let messageCount: number = 0;

export interface ServerInstance {
  app: TemplatedApp;
  token: us_listen_socket;
}

export const createServer = (
  listeningPort: number,
  messenger: MessagingProvider,
): Promise<ServerInstance> => {
  const app = uWS.App().ws("/*", {
    compression: uWS.DISABLED,
    maxPayloadLength: MAX_PAYLOAD_LENGTH,
    message: (ws: WebSocket<never>, message, isBinary) => {
      // Backpressure control: buffered amount of data
      if (ws.getBufferedAmount() > MAX_BUFFERED_AMOUNT_PER_CONNECTION) {
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
        console.log(validation);
        if ("valid" != validation.kind) {
          console.error("Invalid message received", validation.violations);
          return;
        }
        // All fine, send message to Kafka
        messenger
          .sendBinary(KAFKA_TOPIC, [
            {
              value: Buffer.from(messagePayload),
            },
          ])
          .catch((err) => {
            console.error("[KAFKA] Error caught:", err);
            ws.end(1011, "Error in messenger upstream");
          })
          .finally(() => {
            messageCount++;
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
    setInterval(() => {
      console.log("Messages processed per minute:", messageCount);
      messageCount = 0;
    }, 60000);
    app.listen(listeningPort, (token) => {
      resolve({ app, token });
    });
  });
};
