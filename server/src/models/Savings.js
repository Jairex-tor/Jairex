const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['food', 'entertainment', 'gifts', 'travel', 'shopping', 'bills', 'savings', 'other'],
    default: 'savings'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const savingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coupleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Couple',
    default: null
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  goalName: {
    type: String,
    required: true,
    trim: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 1
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  timesPerWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  amountPerDeposit: {
    type: Number,
    required: true,
    min: 1
  },
  deadline: {
    type: Date,
    default: null,
  },
  estimatedCompletionDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  recurring: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'], default: 'weekly' },
    nextDeposit: { type: Date, default: null },
  },
  transactions: [transactionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

function calculateCompletionDate(targetAmount, currentAmount, timesPerWeek, amountPerDeposit) {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return new Date();
  const weeklyContribution = timesPerWeek * amountPerDeposit;
  if (weeklyContribution <= 0) return null;
  const weeksNeeded = remaining / weeklyContribution;
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + Math.ceil(weeksNeeded) * 7);
  return completionDate;
}

savingsSchema.pre('save', function () {
  if (
    this.isModified('targetAmount') ||
    this.isModified('currentAmount') ||
    this.isModified('timesPerWeek') ||
    this.isModified('amountPerDeposit')
  ) {
    this.estimatedCompletionDate = calculateCompletionDate(
      this.targetAmount,
      this.currentAmount,
      this.timesPerWeek,
      this.amountPerDeposit
    );
  }
});
 
savingsSchema.virtual('progressPercentage').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

savingsSchema.set('toJSON', { virtuals: true });
savingsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Savings', savingsSchema);
