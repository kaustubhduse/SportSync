import {addPlayerOrTeamToAuction} from '../controllers/auction.controller.js';
import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

const MAX_RETRIES = 10;
const BASE_DELAY = 1000; 

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const consumeMessages = async (queue) => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();

      await channel.assertQueue(queue, { durable: true });

      channel.consume(queue, (message) => {
        if (message) {
          const content = JSON.parse(message.content.toString());
          console.log(`✅ Received message from ${queue}:`, content);

          // Handle the message (e.g., save to DB, update auction, etc.)
          addPlayerOrTeamToAuction(content);

          channel.ack(message);
        }
      });

      console.log(`🎯 Waiting for messages in ${queue}...`);
      break; 
    } catch (err) {
      retries++;
      const backoff = BASE_DELAY * 2 ** (retries - 1); // Exponential backoff
      console.error(`❌ RabbitMQ connection failed (attempt ${retries}):`, err.message);

      if (retries >= MAX_RETRIES) {
        console.error('🛑 Max retry attempts reached. Exiting consumer...');
        process.exit(1);
      }

      console.log(`⏳ Retrying in ${backoff / 1000}s...`);
      await delay(backoff);
    }
  }
};
