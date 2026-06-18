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
import { createRedisTrailTracker } from "@repo/redis-adapter/trail";
import { createUserStore } from "@repo/redis-adapter/user";

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
    const tracker = createRedisTrailTracker({
      url: "redis://default@localhost:6379",
      TrailStoreMaxTimeMs: 0,
      TrailStoreMaxPoints: 0,
    });
    const userStore = createUserStore({
      url: "redis://default@localhost:6379",
    });
    await store.connect();
    await tracker.connect();
    await userStore.connect();
    const { token, shutdown } = await createServer({
      messenger,
      store,
      tracker,
      userStore,
      topicName,
      listeningPort: LISTEN_PORT,
    });
    console.log("GEO transponder is listening on port ", LISTEN_PORT);

    process.on("SIGINT", async () => {
      console.log("Closing GEO transponder...");
      us_listen_socket_close(token);
      await shutdown();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start GEO transponder:", error);
    process.exit(1);
  }
};

await bootstrap();
