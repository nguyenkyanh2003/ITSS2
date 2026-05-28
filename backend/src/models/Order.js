const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['COD', 'Bank Transfer'],
      default: 'COD',
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
    meetingLocationId: { type: String, trim: true },
    meetingSpot: { type: String, trim: true },
    proposedTimeSlots: [
      {
        startAt: { type: Date },
        endAt: { type: Date },
        note: { type: String, trim: true },
      },
    ],
    finalTime: {
      startAt: { type: Date },
      endAt: { type: Date },
      note: { type: String, trim: true },
    },
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

orderSchema.index({ 'items.product': 1, status: 1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
