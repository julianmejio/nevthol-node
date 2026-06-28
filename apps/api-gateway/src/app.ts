import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import authenticationRoutes from "./routes/authentication";
import type { Logger } from "@repo/logger";
import { errorHandler } from "./middleware/errorHandler";
import elevationRouter from "./routes/elevation.routes";

const createExpress = ({ logger }: { logger: Logger }): Express => {
  const app: Express = express();

  app.use(logger.httpLoggerMiddleware);
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/authentication", authenticationRoutes);
  app.use("/elevation", elevationRouter);

  app.use(errorHandler);

  return app;
};

export { createExpress };
