// models/event.model.js

import mongoose from 'mongoose';

export const CategoryEnum = ['cricket', 'football', 'badminton', 'volleyball', 'other'];

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      enum: CategoryEnum,
      default: 'other',
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    location: {
      type: String,
      required: [true, 'Event location is required'],
    },
    createdBy: {
      type: String,
      required: [true, 'CreatedBy userId is required'],
    },
    participants: [
      {
        userId: {
          type: String,
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['confirmed', 'pending', 'rejected'],
          default: 'pending',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model('Event', eventSchema);
export default Event;
