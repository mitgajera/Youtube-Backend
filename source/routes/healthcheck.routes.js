import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controller.js";

const router = Router();

router.route("/").get(healthCheck);

// http://localhost:8000/api/v1/healthcheck

export default router;

