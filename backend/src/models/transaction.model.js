const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduling', 'pending', 'completed', 'cancelled'],
      default: 'scheduling',
      index: true,
    },
    meetingSpot: { type: String, trim: true },
    scheduledTime: { type: Date },
    timeSlot: {
      startAt: { type: Date },
      endAt: { type: Date },
      note: { type: String, trim: true },
    },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
