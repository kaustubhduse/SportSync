import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
let channel;
let connection;

const MAX_RETRIES = 5;
let retries = 0;

const createConnection = async () => {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
    if (retries < MAX_RETRIES) {
      retries++;
      console.error(`❌ Failed to connect to RabbitMQ (Attempt ${retries}/${MAX_RETRIES}):`, error.message);
      setTimeout(createConnection, 5000); // Retry in 5 seconds
    } else {
      console.error('🚫 Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

export const initRabbitMQ = async () => {
  await createConnection();
};

export const publishMessage = async (queue, message) => {
  if (!channel) {
    console.error('❌ RabbitMQ channel not initialized');
    return;
  }

  try {
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    console.log(`✅ Message sent to ${queue}:`, message);
  } catch (error) {
    console.error('❌ Error publishing message to queue:', error);
  }
};

export const closeConnection = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('✅ RabbitMQ connection closed');
  } catch (error) {
    console.error('❌ Error closing RabbitMQ connection:', error);
  }
};
