import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 8005,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};