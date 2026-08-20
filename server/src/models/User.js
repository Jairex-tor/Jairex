const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId && !this.githubId;
    },
    minlength: 6
  },
  avatar: {
    type: String,
    default: ''
  },
  coupleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Couple',
    default: null
  },
  googleId: {
    type: String,
    default: null
  },
  githubId: {
    type: String,
    default: null
  },
  settings: {
    notifications: { type: Boolean, default: true },
    theme: { type: String, default: 'minecraft' },
    currency: { type: String, default: 'USD' }
  },
  xp: {
    type: Number,
    default: 0
  },
  achievements: {
    type: [String],
    default: []
  },
  streak: {
    type: Number,
    default: 0
  },
  lastActiveDate: {
    type: Date,
    default: null
  },
  bestStreak: {
    type: Number,
    default: 0
  },
  lastDepositDate: {
    type: Date,
    default: null
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  pushSubscription: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('level').get(function () {
  return Math.floor(Math.sqrt(this.xp / 100)) + 1;
});

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  delete obj.githubId;
  delete obj.__v;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  delete obj.pushSubscription;
  obj.level = this.level;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
