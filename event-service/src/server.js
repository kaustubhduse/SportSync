import { connectMongoDB } from "./config/db.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import eventRoutes from "./routes/event.routes.js";
import { initRabbitMQ } from "./rabbitmq/rabbitmq.publisher.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/event', eventRoutes);

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  try {
    await connectMongoDB();
    await initRabbitMQ();

    app.listen(PORT, () => {
      console.log(`Event Service is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Event Service:', err);
    process.exit(1); 
  }
};

startServer();
