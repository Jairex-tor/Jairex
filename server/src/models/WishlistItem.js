const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  coupleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Couple',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 300
  },
  price: {
    type: Number,
    default: null,
    min: 0
  },
  link: {
    type: String,
    default: '',
    maxlength: 500
  },
  emoji: {
    type: String,
    default: '🎁'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  saved: {
    type: Boolean,
    default: false
  },
  savedAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WishlistItem', wishlistItemSchema);
