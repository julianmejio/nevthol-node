import uWS, { type TemplatedApp, type us_listen_socket } from "uWebSockets.js";
import { PlayerPositionSchema } from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
import { fromBinary } from "@bufbuild/protobuf";

export interface ServerInstance {
  app: TemplatedApp;
  token: us_listen_socket;
}

export const createServer = (
  listeningPort: number,
): Promise<ServerInstance> => {
  const app = uWS.App().ws("/*", {
    compression: uWS.DISABLED,
    maxPayloadLength: 2 * 1024,
    idleTimeout: 10,
    message: (_ws, message, isBinary) => {
      if (!isBinary) {
        console.error(
          "Discarded non-binary message. Clients must send binary PB GEO signals for being processed",
        );
        return;
      }
      const messagePayload = new Uint8Array(message);
      const playerPosition = fromBinary(PlayerPositionSchema, messagePayload);
      console.log("Received GEO position", playerPosition);
    },
  });
  return new Promise((resolve) => {
    app.listen(listeningPort, (token) => {
      resolve({ app, token });
    });
  });
};
