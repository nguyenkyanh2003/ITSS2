const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reportedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    type: {
      type: String,
      enum: ['fake_product', 'fraud', 'inappropriate', 'spam', 'other'],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
    },
    adminNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
