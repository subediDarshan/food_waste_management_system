const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodListing', required: true },
    NGOId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    claimStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

claimSchema.index({ foodId: 1 });
claimSchema.index({ NGOId: 1 });

module.exports = mongoose.model('Claim', claimSchema);
