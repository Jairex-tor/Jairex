const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  coupleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Couple',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['text', 'coin', 'system'],
    default: 'text'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ coupleId: 1, createdAt: -1 });

messageSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Message', messageSchema);