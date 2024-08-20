import express from 'express';
import { asyncHandler } from "../utils/asyncHandler.js";
import { registerUser } from "../controllers/user.controller.js";


const router = express.Router();
router.post('/register', asyncHandler(registerUser));
export default router;