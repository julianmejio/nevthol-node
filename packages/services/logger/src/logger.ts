import pino, { type LevelWithSilent } from "pino";
import { type HttpLogger, pinoHttp } from "pino-http";

const LogLevel = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  critical: "fatal",
} as const satisfies Record<string, LevelWithSilent>;

interface LoggerParameters {
  serviceName: string;
  logLevel?: (typeof LogLevel)[keyof typeof LogLevel];
}

type Logger = { httpLoggerMiddleware: HttpLogger } & {
  [K in keyof typeof LogLevel]: (
    message: string,
    context?: object,
    error?: object,
  ) => void;
};

const createLogger = (params: LoggerParameters): Logger => {
  const logger = pino({
    level: process.env.LOG_LEVEL || LogLevel.debug,
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    base: {
      env: process.env.NODE_ENV || "development",
      service: params.serviceName,
      instance_id: process.env.INSTANCE_ID || "local-dev",
    },
    mixin() {
      return {};
    },
  });

  const httpLoggerMiddleware = pinoHttp({
    logger: logger,
    autoLogging: true,
    genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
    customSuccessMessage: (req, _res, responseTime) =>
      `${req.method} ${req.url} completed in ${responseTime} ms`,
    customErrorMessage: (req, _res, error) =>
      `${req.method} ${req.url} failed: ${error.message}`,
  });

  return {
    debug: (message: string, context?: object) =>
      logger.debug({ ctx: context }, message),
    info: (message: string, context?: object) =>
      logger.info({ ctx: context }, message),
    warn: (message: string, context?: object) =>
      logger.warn({ ctx: context }, message),
    error: (message: string, error?: object, context?: object) =>
      logger.error({ ctx: context, err: error }, message),
    critical: (message: string, error?: object, context?: object) =>
      logger.fatal({ ctx: context, err: error, alert_ops: true }, message),
    httpLoggerMiddleware: httpLoggerMiddleware,
  };
};

export { type Logger, createLogger };
