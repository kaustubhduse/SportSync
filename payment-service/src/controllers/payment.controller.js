import Stripe from 'stripe';
import dotenv from 'dotenv';
import { Payment } from '../models/payment.model.js';
import redisClient from '../utils/redisClient.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a payment intent
export async function createPaymentIntent(req, res, next) {
  try {
    const { amount, currency = 'usd', payment_method_types = ['card'] } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types,
    });

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (error) {
    next(error);
  }
}

// Handle Stripe webhook events
export async function stripeWebhookHandler(req, res, next) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`✅ Payment succeeded: ${paymentIntent.id}`);

        await Payment.create({
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        });

        console.log(`🔔 Received event: ${event.type}`);

        // Notify other services (event-driven example)
        // await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
        //   type: 'PAYMENT_SUCCESS',
        //   data: { paymentId: paymentIntent.id },
        // });

        // break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        console.log(`❌ Payment failed: ${failedIntent.id}`);

        await redisClient.lPush('failedWebhooks', JSON.stringify({
          id: failedIntent.id,
          type: 'payment_failed',
          timestamp: new Date().toISOString(),
        }));

        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
