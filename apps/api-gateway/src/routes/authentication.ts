import { Router } from "express";
import { authenticate } from "../controllers/authenticationController";

const router: Router = Router();

router.post("/authenticate", authenticate);

export default router;
