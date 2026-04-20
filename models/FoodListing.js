const mongoose = require('mongoose');

const foodListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    expiryTime: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['available', 'claimed', 'expired'],
      default: 'available'
    }
  },
  { timestamps: true }
);

// Single-field indexes
foodListingSchema.index({ expiryTime: 1 });
foodListingSchema.index({ location: 1 });

// Compound index on location + expiryTime
foodListingSchema.index({ location: 1, expiryTime: 1 });

module.exports = mongoose.model('FoodListing', foodListingSchema);
