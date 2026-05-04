import { LISTEN_PORT } from "./config.js";
import { createServer } from "./server.js";
import process from "node:process";
import { us_listen_socket_close } from "uWebSockets.js";

const bootstrap = async (): Promise<void> => {
  try {
    const { token } = await createServer(LISTEN_PORT);
    console.log("GEO transponder is listening on port ", LISTEN_PORT);

    process.on("SIGTERM", () => {
      console.log("Closing GEO transponder...");
      us_listen_socket_close(token);
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start GEO transponder:", error);
    process.exit(1);
  }
};

await bootstrap();
