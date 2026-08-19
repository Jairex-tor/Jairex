const express = require('express');
const Savings = require('../models/Savings');
const Couple = require('../models/Couple');
const auth = require('../middleware/auth');
const gamification = require('../services/gamification');
const { notifyUser } = require('../services/notify');

const router = express.Router();

router.use(auth);

router.post('/goal', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple to create goals' });
    }

    const { goalName, targetAmount, timesPerWeek, amountPerDeposit } = req.body;

    const goal = new Savings({
      userId: req.user._id,
      coupleId: req.user.coupleId,
      goalName,
      targetAmount,
      timesPerWeek,
      amountPerDeposit
    });

    await goal.save();
    const io = req.app.get('io');
    await gamification.addXP(req.user._id, gamification.XP.CREATE_GOAL, io);
    await gamification.grantAchievement(req.user._id, 'goal_setter', io);
    res.status(201).json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/goals', async (req, res) => {
  try {
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
    const goal = await Savings.findOne({
      _id: req.params.id,
      coupleId: req.user.coupleId
    })
      .populate('userId', 'username avatar')
      .populate('transactions.addedBy', 'username avatar');

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/goal/:id', async (req, res) => {
  try {
    const { goalName, targetAmount, timesPerWeek, amountPerDeposit, isActive } = req.body;

    const goal = await Savings.findOneAndUpdate(
      { _id: req.params.id, coupleId: req.user.coupleId },
      { goalName, targetAmount, timesPerWeek, amountPerDeposit, isActive },
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/goal/:id', async (req, res) => {
  try {
    const goal = await Savings.findOneAndDelete({
      _id: req.params.id,
      coupleId: req.user.coupleId
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/goal/:id/deposit', async (req, res) => {
  try {
    const { amount, note } = req.body;

    const goal = await Savings.findOne({
      _id: req.params.id,
      coupleId: req.user.coupleId
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    goal.transactions.push({
      amount,
      note: note || '',
      addedBy: req.user._id
    });

    goal.currentAmount += amount;

    const wasComplete = goal.currentAmount - amount >= goal.targetAmount;
    await goal.save();

    const io = req.app.get('io');

    await gamification.addXP(req.user._id, gamification.XP.DEPOSIT, io);
    await gamification.grantAchievement(req.user._id, 'first_deposit', io);
    await gamification.grantAchievement(req.user._id, 'hundred_club', io);

    // Notify partner about the deposit
    const couple = await Couple.findById(req.user.coupleId);
    const partnerId = couple && couple.partner1 && couple.partner2
      ? (couple.partner1.toString() === req.user._id.toString() ? couple.partner2 : couple.partner1)
      : null;

    if (partnerId) {
      await notifyUser(io, partnerId, {
        type: 'goal',
        title: 'New Deposit',
        message: `${req.user.username} deposited ${amount} to "${goal.goalName}"`,
        icon: '🪙',
        data: { goalId: goal._id },
      });
    }

    if (!wasComplete && goal.currentAmount >= goal.targetAmount) {
      await gamification.addXP(req.user._id, gamification.XP.COMPLETE_GOAL, io);
      const goals = await Savings.find({ coupleId: req.user.coupleId });
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
      if (partnerId) {
        await notifyUser(io, partnerId, {
          type: 'goal',
          title: 'Goal Complete!',
          message: `${req.user.username} finished saving for "${goal.goalName}"! 🎉`,
          icon: '🏆',
          data: { goalId: goal._id },
        });
      }
    }

    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Clear a goal (reset progress)
router.post('/goal/:id/clear', async (req, res) => {
  try {
    const goal = await Savings.findOne({
      _id: req.params.id,
      coupleId: req.user.coupleId
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    goal.currentAmount = 0;
    goal.transactions = [];
    await goal.save();

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
    res.json({ message: 'All savings data cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/goal/:id/transactions', async (req, res) => {
  try {
    const goal = await Savings.findOne({
      _id: req.params.id,
      coupleId: req.user.coupleId
    }).populate('transactions.addedBy', 'username avatar');

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    res.json({ transactions: goal.transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
