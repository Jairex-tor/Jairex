const express = require('express');
const Savings = require('../models/Savings');
const Couple = require('../models/Couple');
const User = require('../models/User');
const auth = require('../middleware/auth');
const gamification = require('../services/gamification');
const { notifyUser } = require('../services/notify');

const router = express.Router();

router.use(auth);

async function getPartnerId(coupleId, userId) {
  const couple = await Couple.findById(coupleId);
  if (!couple) return null;
  const a = couple.partner1?.toString();
  const b = couple.partner2?.toString();
  if (a === userId.toString()) return b;
  if (b === userId.toString()) return a;
  return null;
}

async function findGoal(goalId, user) {
  const goal = await Savings.findById(goalId);
  if (!goal) return null;
  if (goal.groupId) {
    const Group = require('../models/Group');
    const group = await Group.findById(goal.groupId);
    if (!group || !group.members.some((m) => m.toString() === user._id.toString())) return null;
    return goal;
  }
  if (goal.coupleId && user.coupleId && goal.coupleId.toString() === user.coupleId.toString()) return goal;
  return null;
}

function emitSavingsChanged(io, room) {
  if (room) io.to(`couple-${room}`).emit('savings-changed', { id: room });
}

router.post('/goal', async (req, res) => {
  try {
    const { goalName, targetAmount, timesPerWeek, amountPerDeposit, groupId } = req.body;

    if (groupId) {
      const Group = require('../models/Group');
      const group = await Group.findById(groupId);
      if (!group || !group.members.some((m) => m.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }
    } else if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple or group to create goals' });
    }

    const goal = new Savings({
      userId: req.user._id,
      coupleId: groupId ? null : req.user.coupleId,
      groupId: groupId || null,
      goalName,
      targetAmount,
      timesPerWeek,
      amountPerDeposit
    });

    await goal.save();
    const io = req.app.get('io');
    await gamification.addXP(req.user._id, gamification.XP.CREATE_GOAL, io);
    await gamification.grantAchievement(req.user._id, 'goal_setter', io);

    if (groupId) {
      emitSavingsChanged(io, `group-${groupId}`);
    } else {
      const partnerId = await getPartnerId(req.user.coupleId, req.user._id);
      if (partnerId) {
        await notifyUser(io, partnerId, {
          type: 'goal',
          title: 'New Goal',
          message: `${req.user.username} created a goal: "${goalName}"`,
          icon: '🎯',
          data: { goalId: goal._id },
        });
      }
      emitSavingsChanged(io, req.user.coupleId);
    }

    res.status(201).json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/goals', async (req, res) => {
  try {
    const { groupId } = req.query;

    if (groupId) {
      const Group = require('../models/Group');
      const group = await Group.findById(groupId);
      if (!group || !group.members.some((m) => m.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }
      const goals = await Savings.find({ groupId })
        .populate('userId', 'username avatar')
        .populate('transactions.addedBy', 'username avatar')
        .sort({ createdAt: -1 });
      return res.json({ goals });
    }

    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple' });
    }

    const goals = await Savings.find({ coupleId: req.user.coupleId })
      .populate('userId', 'username avatar')
      .populate('transactions.addedBy', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ goals });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/goal/:id', async (req, res) => {
  try {
    const goal = await findGoal(req.params.id, req.user);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    await goal.populate('userId', 'username avatar');
    await goal.populate('transactions.addedBy', 'username avatar');
    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/goal/:id', async (req, res) => {
  try {
    const goal = await findGoal(req.params.id, req.user);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const { goalName, targetAmount, timesPerWeek, amountPerDeposit, isActive } = req.body;
    Object.assign(goal, { goalName, targetAmount, timesPerWeek, amountPerDeposit, isActive });
    await goal.save();

    const io = req.app.get('io');
    const room = goal.groupId || req.user.coupleId;
    if (goal.groupId) io.to(`group-${goal.groupId}`).emit('savings-changed', { groupId: goal.groupId });
    else emitSavingsChanged(io, req.user.coupleId);

    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/goal/:id', async (req, res) => {
  try {
    const goal = await findGoal(req.params.id, req.user);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const groupId = goal.groupId;
    await Savings.deleteOne({ _id: goal._id });

    const io = req.app.get('io');
    if (groupId) io.to(`group-${groupId}`).emit('savings-changed', { groupId });
    else emitSavingsChanged(io, req.user.coupleId);

    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/goal/:id/deposit', async (req, res) => {
  try {
    const { amount, note, category } = req.body;

    const goal = await findGoal(req.params.id, req.user);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    goal.transactions.push({
      amount,
      note: note || '',
      category: category || 'savings',
      addedBy: req.user._id
    });

    goal.currentAmount += amount;

    const wasComplete = goal.currentAmount - amount >= goal.targetAmount;
    await goal.save();

    const io = req.app.get('io');

    await gamification.addXP(req.user._id, gamification.XP.DEPOSIT, io);
    await gamification.grantAchievement(req.user._id, 'first_deposit', io);
    await gamification.grantAchievement(req.user._id, 'hundred_club', io);

    // Update streak
    const user = await User.findById(req.user._id);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDeposit = user.lastDepositDate ? new Date(user.lastDepositDate) : null;
    const lastDay = lastDeposit ? new Date(lastDeposit.getFullYear(), lastDeposit.getMonth(), lastDeposit.getDate()) : null;
    const dayDiff = lastDay ? Math.floor((today - lastDay) / 86400000) : -1;

    if (dayDiff === 0) {
      // Same day, no change
    } else if (dayDiff === 1) {
      user.streak = (user.streak || 0) + 1;
    } else {
      user.streak = 1;
    }
    user.lastDepositDate = now;
    if ((user.streak || 0) > (user.bestStreak || 0)) {
      user.bestStreak = user.streak;
    }
    if (user.streak >= 7) await gamification.grantAchievement(req.user._id, 'week_warrior', io);
    await user.save();

    if (goal.groupId) {
      io.to(`group-${goal.groupId}`).emit('savings-changed', { groupId: goal.groupId });
    } else {
      const partnerId = await getPartnerId(req.user.coupleId, req.user._id);
      if (partnerId) {
        await notifyUser(io, partnerId, {
          type: 'goal',
          title: 'New Deposit',
          message: `${req.user.username} deposited ${amount} to "${goal.goalName}"`,
          icon: '🪙',
          data: { goalId: goal._id },
        });
      }
      emitSavingsChanged(io, req.user.coupleId);
    }

    if (!wasComplete && goal.currentAmount >= goal.targetAmount) {
      // Auto-disable recurring on goal completion
      if (goal.recurring?.enabled) {
        goal.recurring.enabled = false;
        goal.recurring.nextDeposit = null;
        await goal.save();
      }

      await gamification.addXP(req.user._id, gamification.XP.COMPLETE_GOAL, io);
      const goals = await Savings.find(goal.groupId ? { groupId: goal.groupId } : { coupleId: req.user.coupleId });
      if (goals.every((g) => g.currentAmount >= g.targetAmount)) {
        await gamification.grantAchievement(req.user._id, 'piggy_master', io);
      }

      await notifyUser(io, req.user._id, {
        type: 'goal',
        title: 'Goal Complete!',
        message: `"${goal.goalName}" is fully saved! 🎉`,
        icon: '🏆',
        data: { goalId: goal._id },
      });
      if (!goal.groupId) {
        const partnerId2 = await getPartnerId(req.user.coupleId, req.user._id);
        if (partnerId2) {
          await notifyUser(io, partnerId2, {
            type: 'goal',
            title: 'Goal Complete!',
            message: `${req.user.username} finished saving for "${goal.goalName}"! 🎉`,
            icon: '🏆',
            data: { goalId: goal._id },
          });
        }
      }
    }

    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/goal/:id/clear', async (req, res) => {
  try {
    const goal = await findGoal(req.params.id, req.user);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    goal.currentAmount = 0;
    goal.transactions = [];
    await goal.save();

    const io = req.app.get('io');
    if (goal.groupId) io.to(`group-${goal.groupId}`).emit('savings-changed', { groupId: goal.groupId });
    else emitSavingsChanged(io, req.user.coupleId);

    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Clear all goals for the couple (reset savings data)
router.delete('/clear', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Not in a couple' });
    }

    await Savings.deleteMany({ coupleId: req.user.coupleId });

    const io = req.app.get('io');
    emitSavingsChanged(io, req.user.coupleId);

    res.json({ message: 'All savings data cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/goal/:id/transactions', async (req, res) => {
  try {
    const goal = await findGoal(req.params.id, req.user);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    await goal.populate('transactions.addedBy', 'username avatar');
    res.json({ transactions: goal.transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/goal/:id/recurring', async (req, res) => {
  try {
    const { enabled, frequency } = req.body;
    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly'];
    if (frequency && !validFrequencies.includes(frequency)) {
      return res.status(400).json({ message: `Invalid frequency. Must be: ${validFrequencies.join(', ')}` });
    }

    const goal = await findGoal(req.params.id, req.user);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.currentAmount >= goal.targetAmount) {
      return res.status(400).json({ message: 'Cannot set recurring on completed goal' });
    }

    goal.recurring.enabled = enabled;
    if (frequency) goal.recurring.frequency = frequency;

    if (enabled) {
      const now = new Date();
      const intervals = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
      const next = new Date(now);
      next.setDate(next.getDate() + (intervals[frequency || goal.recurring.frequency] || 7));
      goal.recurring.nextDeposit = next;
    } else {
      goal.recurring.nextDeposit = null;
    }

    await goal.save();
    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get streak info
router.get('/streak', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('streak bestStreak lastDepositDate');
    res.json({
      streak: user.streak || 0,
      bestStreak: user.bestStreak || 0,
      lastDepositDate: user.lastDepositDate || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
