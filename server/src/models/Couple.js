const mongoose = require('mongoose');

const coupleSchema = new mongoose.Schema({
  partner1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  partner2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  inviteCode: {
    type: String,
    unique: true,
    required: true
  },
  dissolveRequest: {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requestedAt: { type: Date, default: null }
  },
  anniversaryDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

coupleSchema.statics.generateInviteCode = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

coupleSchema.statics.isValidCustomCode = function (code) {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (trimmed.length < 4 || trimmed.length > 16) return false;
  return /^[A-Za-z0-9]+$/.test(trimmed);
};

module.exports = mongoose.model('Couple', coupleSchema);
