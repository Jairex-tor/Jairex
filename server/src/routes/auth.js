const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Couple = require('../models/Couple');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const gamification = require('../services/gamification');

const router = express.Router();

function generateToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const streakResult = await gamification.evaluateStreak(user);
    if (streakResult.isNewDay) {
      await gamification.addXP(user._id, gamification.XP.DAILY_LOGIN);
      if (streakResult.newStreak >= 7) {
        await gamification.grantAchievement(user._id, 'week_warrior', req.app.get('io'));
      }
    }

    const freshUser = await User.findById(user._id);
    const token = generateToken(freshUser);
    res.json({ token, user: freshUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('coupleId');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/couple/create', auth, async (req, res) => {
  try {
    if (req.user.coupleId) {
      return res.status(400).json({ message: 'Already in a couple' });
    }

    const inviteCode = Couple.generateInviteCode();
    const couple = new Couple({
      partner1: req.user._id,
      inviteCode
    });
    await couple.save();

    req.user.coupleId = couple._id;
    await req.user.save();

    res.status(201).json({ couple });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/couple/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (req.user.coupleId) {
      return res.status(400).json({ message: 'Already in a couple' });
    }

    const couple = await Couple.findOne({ inviteCode });
    if (!couple) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    if (couple.partner2) {
      return res.status(400).json({ message: 'Couple is already full' });
    }

    if (couple.partner1.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot join your own couple' });
    }

    couple.partner2 = req.user._id;
    await couple.save();

    req.user.coupleId = couple._id;
    await req.user.save();

    res.json({ couple });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/couple', auth, async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(404).json({ message: 'Not in a couple' });
    }

    const couple = await Couple.findById(req.user.coupleId)
      .populate('partner1', 'username avatar email')
      .populate('partner2', 'username avatar email');

    const partner = couple.partner1._id.toString() === req.user._id.toString()
      ? couple.partner2
      : couple.partner1;

    res.json({ couple: { ...couple.toObject(), partner } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Generate or regenerate invite code
router.post('/couple/invite', auth, async (req, res) => {
  try {
    const couple = req.user.coupleId
      ? await Couple.findById(req.user.coupleId)
      : null;

    if (!couple) {
      const newCouple = new Couple({
        partner1: req.user._id,
        inviteCode: Couple.generateInviteCode()
      });
      await newCouple.save();
      req.user.coupleId = newCouple._id;
      await req.user.save();
      return res.status(201).json({ inviteCode: newCouple.inviteCode, couple: newCouple });
    }

    couple.inviteCode = Couple.generateInviteCode();
    await couple.save();
    res.json({ inviteCode: couple.inviteCode, couple });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Disconnect from couple (both partners unlink)
router.post('/couple/disconnect', auth, async (req, res) => {
  try {
    const coupleId = req.user.coupleId;
    if (!coupleId) {
      return res.status(400).json({ message: 'Not in a couple' });
    }

    const couple = await Couple.findById(coupleId);
    if (couple) {
      if (couple.partner1.toString() === req.user._id.toString()) {
        couple.partner1 = null;
      } else if (couple.partner2 && couple.partner2.toString() === req.user._id.toString()) {
        couple.partner2 = null;
      }

      if (!couple.partner1 && !couple.partner2) {
        await couple.deleteOne();
      } else if (!couple.partner1 && couple.partner2) {
        couple.partner1 = couple.partner2;
        couple.partner2 = null;
        await couple.save();
      } else {
        await couple.save();
      }
    }

    req.user.coupleId = null;
    await req.user.save();

    const otherUserId = couple && couple.partner1
      ? (couple.partner1.toString() === req.user._id.toString() ? couple.partner2 : couple.partner1)
      : null;

    if (otherUserId) {
      const other = await User.findById(otherUserId);
      if (other) {
        other.coupleId = null;
        await other.save();
        await Notification.create({
          user: other._id,
          type: 'partner',
          title: 'Couple Disconnected',
          message: `${req.user.username} left the couple.`,
          icon: '💔',
        });
      }
    }

    res.json({ message: 'Disconnected from couple' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
