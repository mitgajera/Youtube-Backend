import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    addComment,
    deleteComment,
    getVideoComment,
    updateComment,
} from "../controllers/comment.controller.js"

const upload = multer({ dest: "" });
const router = Router();

router.use(verifyJWT());

router.use(verifyJWT, upload.none());

router.route("/:videoId").get(getVideoComment).post(addComment);
router.route("/:commerntId").delete(deleteComment).patch(updateComment);

// http://localhost:8000/api/v1/comment/...

export default router;