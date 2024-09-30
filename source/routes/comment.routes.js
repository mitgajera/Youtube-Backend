import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    addVideoComment,
    deleteVideoComment,
    getVideoComment,
    updateVideoComment,
    getCommunityComment,
    addCommunityComment,
    deleteCommunityComment,
    updateCommunityComment
} from "../controllers/comment.controller.js"

const router = Router();        


router.use(verifyJWT);

router.route("/v/:videoId").get(getVideoComment);
router.route("/v/:videoId").post(addVideoComment);
router.route("/v/:commentId").delete(deleteVideoComment);
router.route("/v/:commentId").patch(updateVideoComment);
router.route("/c/:postId").get(getCommunityComment);
router.route("/c/:postId").post(addCommunityComment);
router.route("/c/:commentId").delete(deleteCommunityComment);
router.route("/c/:commentId").patch(updateCommunityComment);

// http://localhost:8000/api/v1/comment/...

export default router;