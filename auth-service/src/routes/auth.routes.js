import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
} from "../controllers/auth.controller.js";
import { VerifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", VerifyJWT, logoutUser);
router.post("/refresh", refreshAccessToken);
router.post("/change-password", VerifyJWT, changePassword);

export default router;

