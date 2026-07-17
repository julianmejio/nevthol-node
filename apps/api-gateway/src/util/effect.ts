import { Effect, ManagedRuntime } from "effect";
import type { Request, Response, NextFunction, RequestHandler } from "express";

export const toHandler = <A, E, R>(
  effectBuilder: (req: Request, res: Response) => Effect.Effect<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, E>,
  successStatus: number = 200,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const actionEffect = effectBuilder(req, res);
    runtime
      .runPromise(actionEffect)
      .then((result) => {
        if (!res.headersSent && result !== undefined) {
          if (204 === successStatus) {
            res.sendStatus(successStatus);
          }
          res.status(successStatus).json(result);
        }
      })
      .catch((err) => {
        return next(err);
      });
  };
};
