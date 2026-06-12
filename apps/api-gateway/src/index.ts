import { LISTEN_PORT } from "./config";
import { createLogger } from "@repo/logger";
import { createExpress } from "./app";

const serviceName = "api-gateway";

const logger = createLogger({ serviceName });
const app = createExpress({ logger });

try {
  app.listen(LISTEN_PORT, () => {
    logger.debug("API gateway started", { port: LISTEN_PORT });
  });
} catch (error) {
  logger.critical(
    "Unexpected error initializing the API gateway",
    error as object,
    {
      port: LISTEN_PORT,
    },
  );
  process.exit(1);
}
