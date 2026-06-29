import { Router } from "express";
import { AuthenticationController } from "../controllers/authenticationController";
import { toHandler } from "../util/effect";
import { AuthenticationServiceRuntime } from "../runtime";

const router: Router = Router();

router.post(
  "/authenticate",
  toHandler(
    AuthenticationController.postAuthenticate,
    AuthenticationServiceRuntime,
  ),
);

export default router;
