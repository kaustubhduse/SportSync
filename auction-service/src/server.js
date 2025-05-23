import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import auctionRoutes from "./routes/auction.routes.js";
import { createSocketServer, getIO } from "./socket/socket.js";
import { consumeMessages } from "./rabbitmq/rabbitmq.consumer.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = getIO();
  next();
});

app.use("/api/auctions", auctionRoutes);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected (Auction)");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

const server = http.createServer(app);
createSocketServer(server);

const PORT = process.env.PORT || 4002;
server.listen(PORT, () => {
  connectDB();
  console.log(`Auction service running on port ${PORT}`);
  
  // RabbitMQ consumer for auction messages
  consumeMessages("auction-queue")
    .then(() => {
      console.log("RabbitMQ consumer started for auction-queue");
    })
    .catch((error) => {
      console.error("Error starting RabbitMQ consumer:", error);
    });
});
 