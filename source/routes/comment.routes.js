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

router.route("/:videoId").get(getVideoComment);
router.route("/:videoId").post(addVideoComment);
router.route("/:commentId").delete(deleteVideoComment);
router.route("/:commentId").patch(updateVideoComment);
router.route("/:communityId").get(getCommunityComment);
router.route("/:communityId").post(addCommunityComment);
router.route("/:commentId").delete(deleteCommunityComment);
router.route("/:commentId").patch(updateCommunityComment);

// http://localhost:8000/api/v1/comment/...

export default router;