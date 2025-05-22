import { Router } from "express";
import {VerifyJWT} from "../middlewares/auth.middleware.js";
import { createUserProfile, deleteMyProfile, getAllUsers, getMe, getUserById, updateMyProfile } from "../controllers/user.controller.js";

const router = Router();

// create user profile from auth service
router.route("/create-profile").post(createUserProfile);

router.route("/").get(VerifyJWT,getAllUsers);
router.route("/me").get(VerifyJWT,getMe);
router.route("/:id").get(VerifyJWT,getUserById);
router.route("/me").put(VerifyJWT, updateMyProfile);
router.route("/me").delete(VerifyJWT,deleteMyProfile);

export default router;  