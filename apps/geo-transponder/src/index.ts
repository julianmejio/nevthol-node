import { LISTEN_PORT, MESSENGER_BROKER } from "./config.js";
import { createServer } from "./server.js";
import process from "node:process";
import { us_listen_socket_close } from "uWebSockets.js";
import { createKafkaPublisher } from "@repo/kafka-adapter/node-rdkafka";

// Hardcoded as this is part of the internal versioning
const topicName: string = "player-position-v1";

const bootstrap = async (): Promise<void> => {
  try {
    const messenger = createKafkaPublisher({
      clientId: "geo-transponder",
      brokers: [MESSENGER_BROKER],
      queueBufferingMaxMessages: 1000000,
      queueBufferingMaxMs: 50,
      batchNumMessages: 10000,
      compressionCodec: "none",
      requestRequiredAcks: 1,
      eventCb: true,
    });
    await messenger.connect();
    const { token } = await createServer({
      messenger,
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
