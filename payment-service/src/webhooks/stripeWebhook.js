import express from 'express';
import { stripe } from '../utils/stripe.js';
import { config } from '../config/env.js';
const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('✅ Payment successful:', session.id);
    // Optional: Save to DB or emit via Socket.IO
  }

  res.status(200).json({ received: true });
});

export default router;