const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true },
    productStatus: {
      type: String,
      enum: ['new', 'used', 'other'],
      default: 'used',
    },
    purchaseDate: { type: Date },
    usageLevel: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'inactive'],
      default: 'available',
      index: true,
    },
    location: {
      campusArea: { type: String, trim: true },
      dorm: { type: String, trim: true },   
      district: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    meetingSpots: [{ type: String, trim: true }],
    availableTimeSlots: [
      {
        startAt: { type: Date },
        endAt: { type: Date },
        note: { type: String, trim: true },
      },
    ],
    images: [
      {
        url: { type: String, trim: true },
        alt: { type: String, trim: true },
      },
    ],
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    viewCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', category: 'text' });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
