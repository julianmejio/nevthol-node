import uWS from "uWebSockets.js";
import { LISTEN_PORT } from "./config";
import { PlayerPositionSchema } from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
import { fromBinary } from "@bufbuild/protobuf";

uWS
  .App()
  .ws("/*", {
    compression: uWS.DISABLED,
    maxPayloadLength: 2 * 1024,
    idleTimeout: 10,
    message: (ws, message, isBinary) => {
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
  })
  .listen(LISTEN_PORT, (token) => {
    if (token) {
      console.log("GEO transponder started and listening on port", LISTEN_PORT);
    }
  });
