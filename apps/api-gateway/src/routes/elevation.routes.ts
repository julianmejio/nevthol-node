import { Router } from "express";
import { toHandler } from "../util/effect";
import { ElevationController } from "../controllers/elevation.controller";
import { ElevationServiceRuntime } from "../runtime";

const elevationRouter: Router = Router();

elevationRouter.post(
  "/challenges",
  toHandler(ElevationController.postChallenge, ElevationServiceRuntime),
);
elevationRouter.post(
  "/challenges/:id",
  toHandler(ElevationController.postSolve, ElevationServiceRuntime),
);

export default elevationRouter;
