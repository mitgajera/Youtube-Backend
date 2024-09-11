import { Router } from "express";
import {
    toggleVideoLike,
    toggleCommentLike,
    getLikedVideos,
    toggleCommunityLike
} from "../controllers/like.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/c/:videoId").post(toggleCommentLike);
router.route("/:videos").get(getLikedVideos);
router.route("/toggle/cmt/:videoId").post(toggleCommunityLike);

// http://localhost:8000/api/v1/like/...

export default router;