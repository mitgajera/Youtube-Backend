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

router.route("/:videoId").get(getVideoComment);
router.route("/:videoId").post(addVideoComment);
router.route("/:videoId").delete(deleteVideoComment);
router.route(":videoId").patch(updateVideoComment);
router.route("/:communityId").get(getCommunityComment);
router.route("/:communityId").post(addCommunityComment);
router.route("/:communityId").delete(deleteCommunityComment);
router.route("/:communityId").patch(updateCommunityComment);

// http://localhost:8000/api/v1/comment/...

export default router;