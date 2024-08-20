import express from 'express';
import { asyncHandler } from "../utils/asyncHandler.js";
import { registerUser } from "../controllers/user.controller.js";
import { Router } from 'express';


const router = Router()

router.route("/register").post(registerUser)

export default router;