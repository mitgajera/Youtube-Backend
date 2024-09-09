import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    addComment,
    deleteComment,
    getVideoComment,
    updateComment,
} from "../controllers/comment.controller.js"

const router = Router();


router.use(verifyJWT, upload.none());

router.route("/:videoid")
    .get(getVideoComment)
    .post(addComment);

router.route("/:commentid")
    .delete(deleteComment)
    .patch(updateComment);

// http://localhost:8000/api/v1/comment/...

export default router;