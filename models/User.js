const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['donor', 'ngo'], required: true }
  },
  { timestamps: true }
);

// Unique index on email is created automatically by `unique: true` above.

module.exports = mongoose.model('User', userSchema);
