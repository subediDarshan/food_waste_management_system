const mongoose = require('mongoose');

const foodDetailsSchema = new mongoose.Schema({
  category: { 
    type: String, 
    enum: ['Cooked', 'Raw Ingredients', 'Packaged', 'Other'], 
    default: 'Cooked' 
  },
  isVegetarian: { type: Boolean, default: false },
  allergens: [{ type: String }] 
}, { _id: false }); 

const foodListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    expiryTime: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    
    
    details: { type: foodDetailsSchema, default: () => ({}) },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['available', 'claimed', 'expired'],
      default: 'available'
    }
  },
  { timestamps: true }
);

foodListingSchema.index({ expiryTime: 1 });
foodListingSchema.index({ location: 1 });
foodListingSchema.index({ location: 1, expiryTime: 1 });

foodListingSchema.index({ 'details.isVegetarian': 1 });

module.exports = mongoose.model('FoodListing', foodListingSchema);
