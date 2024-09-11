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


router.use(verifyJWT, upload.none());

router.route("/videoId").get(getVideoComment).post(addVideoComment);
router.route("/commentId").delete(deleteVideoComment).patch(updateVideoComment);
router.route("/communityId").get(getCommunityComment).post(addCommunityComment);
router.route("/commentId").delete(deleteCommunityComment).patch(updateCommunityComment);

// http://localhost:8000/api/v1/comment/...

export default router;