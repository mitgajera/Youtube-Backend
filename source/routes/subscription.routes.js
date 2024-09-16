import { Router } from "express";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getUserSubscribers
} from "../controllers/subscription.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/c/:channelId").get(getUserChannelSubscribers);
router.route("/c/:channelId").post(toggleSubscription);
router.route("/u/:subscriberId").get(getUserSubscribers);

// http://localhost:8000/api/v1/subscriptions/...

export default router;