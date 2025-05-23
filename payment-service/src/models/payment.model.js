import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentIntentId: String,
  amount: Number,
  currency: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
});

export const Payment = mongoose.model('Payment', paymentSchema);
