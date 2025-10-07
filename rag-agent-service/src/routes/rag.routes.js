import express from "express";
import { queryHandler, indexHandler } from "../controllers/rag.controller.js";

const router = express.Router();

router.post("/index", indexHandler);

router.post("/query", queryHandler);

export default router;
