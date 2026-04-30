import uWS from 'uWebSockets.js';
import { PlayerPositionSchema } from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
import { fromBinary } from "@bufbuild/protobuf";

uWS.App().ws('/*', {
    compression: uWS.DISABLED,
    maxPayloadLength: 2 * 1024,
    idleTimeout: 10,
    message: (ws, message, isBinary) => {
        if(!isBinary) {
            console.error('Receive non-binary message. Discarding…');
            return;
        }
        const bytes = new Uint8Array(message);
        const position = fromBinary(PlayerPositionSchema, bytes);
    }
}).listen(9001, token => {
    if(token) {
        console.log('Listening…');
    }
});