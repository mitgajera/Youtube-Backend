import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
    publishVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
} from "../controllers/video.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router
    .route("/publish-video")
    .post(
        verifyJWT,
        upload.fields([
            {
                name: "video",
                maxCount: 1
            },
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]),
        publishVideo
    );
router.route("/all-Videos").get(getAllVideos);
router.route("/v/:videoId").get(verifyJWT, getVideoById);

router
    .route("/v/:videoId/update-video")
    .patch(
        upload.fields([
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]),
        verifyJWT,
        updateVideo);
router.route("/v/:videoId/delete-video").delete(verifyJWT, deleteVideo);
router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);

// http://localhost:8000/api/v1/video/...

export default router;