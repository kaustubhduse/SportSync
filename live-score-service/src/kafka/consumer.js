import { Kafka } from "kafkajs";
import dotenv from "dotenv";
import { io } from "../utils/socket.js";

dotenv.config();

const kafka = new Kafka({
  clientId: `${process.env.KAFKA_CLIENT_ID}-consumer`,
  brokers: [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: "live-score-consumers" });

export const connectConsumer = async () => {
  try {
    await consumer.connect();
    // Subscribe to multiple topics
    await consumer.subscribe({ topic: "match-created", fromBeginning: false });
    await consumer.subscribe({ topic: "live-score-updated", fromBeginning: false });

    console.log("✅ Kafka Consumer connected and listening...");

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`📢 Kafka Event received from ${topic}:`, data);

          // Emit via Socket.IO
          io.emit("live-score-update", data);
        } catch (err) {
          console.error("❌ Error parsing Kafka message:", err);
        }
      },
    });
  } catch (err) {
    console.error("❌ Kafka Consumer error:", err);
  }
};
