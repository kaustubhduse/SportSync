// kafka/producer.js
import { Kafka } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();

export const connectProducer = async () => {
  try {
    await producer.connect();
    console.log("✅ Kafka Producer connected");
  } catch (err) {
    console.error("❌ Kafka Producer connection error:", err);
  }
};

export const produceMessage = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(`📤 Kafka: Message sent to topic ${topic}`);
  } catch (err) {
    console.error("❌ Kafka produce error:", err);
  }
};
