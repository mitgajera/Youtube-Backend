import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createPost,
    updatePost,
    deletePost,
    getUserPost
} from "../controllers/community.controller.js";

const router = Router(); // Declare router only once

router.use(verifyJWT);

router.route("/users/create-post").post(
    upload.fields([
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    createPost
);

router.route("/users/update-post/:postId").patch(
    upload.fields([
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    updatePost
);

router.route("/users/:userId/posts").post(getUserPost);
router.route("/users/:postId").delete(deletePost);

export default router;