import {
  LISTEN_PORT,
  MESSENGER_BROKER,
  QUEUE_BUFFERING_MAX_MESSAGES,
  QUEUE_BUFFERING_MAX_MS,
  BATCH_NUM_MESSAGES,
  COMPRESSION_CODEC,
  REQUEST_REQUIRED_ACKS,
  EVENT_CB,
} from "./config.js";
import { createServer } from "./server.js";
import process from "node:process";
import { us_listen_socket_close } from "uWebSockets.js";
import { createKafkaPublisher } from "@repo/kafka-adapter/node-rdkafka";
import { createConnectionStore } from "@repo/redis-adapter/connection";

// Hardcoded as this is part of the internal versioning
const topicName: string = "player-position-v1";

const bootstrap = async (): Promise<void> => {
  try {
    const messenger = createKafkaPublisher({
      clientId: "geo-transponder",
      brokers: [MESSENGER_BROKER],
      queueBufferingMaxMessages: QUEUE_BUFFERING_MAX_MESSAGES,
      queueBufferingMaxMs: QUEUE_BUFFERING_MAX_MS,
      batchNumMessages: BATCH_NUM_MESSAGES,
      compressionCodec: COMPRESSION_CODEC,
      requestRequiredAcks: REQUEST_REQUIRED_ACKS,
      eventCb: EVENT_CB,
    });
    await messenger.connect();
    const store = createConnectionStore({
      url: "redis://default@localhost:6379",
    });
    await store.connect();
    const { token } = await createServer({
      messenger,
      store,
      topicName,
      listeningPort: LISTEN_PORT,
    });
    console.log("GEO transponder is listening on port ", LISTEN_PORT);

    process.on("SIGTERM", async () => {
      console.log("Closing GEO transponder...");
      us_listen_socket_close(token);
      await messenger.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start GEO transponder:", error);
    process.exit(1);
  }
};

await bootstrap();
