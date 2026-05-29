import { createKafkaConsumer } from "@repo/kafka-adapter/kafkajs";
import { fromBinary } from "@bufbuild/protobuf";
import { PlayerPositionSchema } from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
import { createValidator } from "@bufbuild/protovalidate";
import { getGridRoom } from "@repo/utils/coordinates";
import { createRedisTransmitter } from "@repo/redis-adapter";

const validator = createValidator();

const consumer = createKafkaConsumer({
  clientId: "gs-broadcaster",
  brokers: ["localhost:9092"],
  groupId: "test-gs-broadcaster-8",
});

const transmitter = createRedisTransmitter({
  url: "redis://default@localhost:6379",
});

await consumer.connect();
await transmitter.connect();
consumer.subscribe({
  topic: "player-position-v1",
  onmessage: async (message) => {
    const messageDecoded = fromBinary(PlayerPositionSchema, message);
    const validationResult = validator.validate(
      PlayerPositionSchema,
      messageDecoded,
    );
    if (validationResult.error) {
      console.warn("Message is invalid");
      return;
    }

    const { x, y } = messageDecoded;
    await transmitter.broadcastPosition({
      channel: getGridRoom({ x, y, gridSize: 300 }),
      position: {
        playerName: "Player name",
        x: x,
        y: y,
      },
    });
  },
});
