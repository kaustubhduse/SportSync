import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

let channel;

export const connectToRabbitMQ = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertQueue(process.env.DLQ_QUEUE, { durable: true });
  console.log("Connected to RabbitMQ");
  return channel;
};

export const getChannel = () => channel;
