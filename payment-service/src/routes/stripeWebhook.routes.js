import express from "express";
import bodyParser from "body-parser";
import { stripeWebhookHandler } from "../controllers/payment.controller.js";

const router = express.Router();

router.post(
  "/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  stripeWebhookHandler
);

export default router;
