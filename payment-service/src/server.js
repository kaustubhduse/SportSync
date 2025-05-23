import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import paymentRoutes from "./routes/payment.routes.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.routes.js";
import { limiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});

// Mount Stripe webhook router first with raw parser middleware inside the router
app.use("/api/payment", stripeWebhookRoutes);

// Then global JSON parser for all other routes
app.use(bodyParser.json());

app.use(limiter);

app.use("/api/payment", paymentRoutes);

app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("Payment Service is running.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Payment service listening on port ${PORT}`);
});
