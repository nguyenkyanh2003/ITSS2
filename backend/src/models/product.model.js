const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0, required: false },
    discountPercent: { type: Number, min: 0, max: 100, required: false },
    isFeatured: { type: Boolean, default: false },
    category: { type: String, trim: true },
    productStatus: {
      type: String,
      enum: ['new', 'used', 'other'],
      default: 'used',
    },
    purchaseDate: { type: Date, required: false },
    usageLevel: { type: String, trim: true, required: false },
    videoUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'inactive'],
      default: 'available',
      index: true,
    },
    stock: { type: Number, default: 1, required: true },
    location: {
      campusArea: { type: String, trim: true },
      dorm: { type: String, trim: true },   
      district: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    meetingSpots: [{ type: String, trim: true }],
    availableTimeSlots: [
      {
        note: { type: String, trim: true, required: false },
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
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
      default: null,
    },
    viewCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', category: 'text' });

// Additional single-field indexes to improve common filter/sort performance
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'location.campusArea': 1 });
productSchema.index({ 'location.city': 1 });

// Compound indexes for common query patterns
productSchema.index({ status: 1, category: 1, price: 1 });
productSchema.index({ price: 1, createdAt: -1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
