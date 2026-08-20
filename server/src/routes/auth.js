const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ message: 'Please enter an invite code' });
    }

    // If user already has a coupleId, check if it's an empty couple (no partner yet)
    if (req.user.coupleId) {
      const existingCouple = await Couple.findById(req.user.coupleId);
      if (existingCouple && existingCouple.partner2) {
        return res.status(400).json({ message: 'Already in a couple. Leave your current couple first.' });
      }
      if (existingCouple) {
        await Couple.deleteOne({ _id: existingCouple._id });
      }
      req.user.coupleId = null;
      await req.user.save();
    }

    const code = inviteCode.trim().toUpperCase();
    const couple = await Couple.findOne({ inviteCode: code });
    if (!couple) {
      return res.status(404).json({ message: 'Invalid invite code. Check the code and try again.' });
    }

    if (couple.partner2) {
      return res.status(400).json({ message: 'This code is already taken by another player.' });
    }

    if (couple.partner1.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'This is your own code! Share it with your partner.' });
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

    res.json({ couple: { ...couple.toObject(), partner, me: req.user._id } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Generate or regenerate invite code (supports custom codes)
router.post('/couple/invite', auth, async (req, res) => {
  try {
    const { customCode } = req.body || {};
    const couple = req.user.coupleId
      ? await Couple.findById(req.user.coupleId)
      : null;

    if (!couple) {
      if (customCode && !Couple.isValidCustomCode(customCode)) {
        return res.status(400).json({ message: 'Code must be 4-16 letters/numbers' });
      }
      if (customCode) {
        const exists = await Couple.findOne({ inviteCode: customCode.trim().toUpperCase() });
        if (exists) return res.status(400).json({ message: 'That code is already taken' });
      }
      const newCouple = new Couple({
        partner1: req.user._id,
        inviteCode: customCode ? customCode.trim().toUpperCase() : Couple.generateInviteCode()
      });
      await newCouple.save();
      req.user.coupleId = newCouple._id;
      await req.user.save();
      return res.status(201).json({ inviteCode: newCouple.inviteCode, couple: newCouple });
    }

    if (customCode && !Couple.isValidCustomCode(customCode)) {
      return res.status(400).json({ message: 'Code must be 4-16 letters/numbers' });
    }
    if (customCode) {
      const exists = await Couple.findOne({ inviteCode: customCode.trim().toUpperCase() });
      if (exists) return res.status(400).json({ message: 'That code is already taken' });
      couple.inviteCode = customCode.trim().toUpperCase();
    } else {
      couple.inviteCode = Couple.generateInviteCode();
    }
    await couple.save();
    res.json({ inviteCode: couple.inviteCode, couple });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Request to dissolve couple
router.post('/couple/dissolve/request', auth, async (req, res) => {
  try {
    if (!req.user.coupleId) return res.status(400).json({ message: 'Not in a couple' });
    const couple = await Couple.findById(req.user.coupleId);
    if (!couple) return res.status(404).json({ message: 'Couple not found' });

    if (couple.dissolveRequest?.requestedBy) {
      return res.status(400).json({ message: 'Dissolution already requested' });
    }

    couple.dissolveRequest = { requestedBy: req.user._id, requestedAt: new Date() };
    await couple.save();

    const io = req.app.get('io');
    const partnerId = couple.partner1.toString() === req.user._id.toString()
      ? couple.partner2 : couple.partner1;

    if (partnerId) {
      const { notifyUser } = require('../services/notify');
      await notifyUser(io, partnerId, {
        type: 'partner',
        title: 'Dissolve Request',
        message: `${req.user.username} wants to dissolve the couple.`,
        icon: '💔',
      });
    }

    res.json({ message: 'Dissolution requested', dissolveRequest: couple.dissolveRequest });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve dissolution (partner only)
router.post('/couple/dissolve/approve', auth, async (req, res) => {
  try {
    if (!req.user.coupleId) return res.status(400).json({ message: 'Not in a couple' });
    const couple = await Couple.findById(req.user.coupleId);
    if (!couple) return res.status(404).json({ message: 'Couple not found' });

    if (!couple.dissolveRequest?.requestedBy) {
      return res.status(400).json({ message: 'No pending dissolution request' });
    }

    if (couple.dissolveRequest.requestedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot approve your own request' });
    }

    const p1 = couple.partner1;
    const p2 = couple.partner2;
    await couple.deleteOne();

    if (p1) { await User.findByIdAndUpdate(p1, { coupleId: null }); }
    if (p2) { await User.findByIdAndUpdate(p2, { coupleId: null }); }

    const io = req.app.get('io');
    const otherId = p1.toString() === req.user._id.toString() ? p2 : p1;
    if (otherId) {
      const { notifyUser } = require('../services/notify');
      await notifyUser(io, otherId, {
        type: 'partner',
        title: 'Couple Dissolved',
        message: 'The couple has been dissolved.',
        icon: '💔',
      });
    }

    res.json({ message: 'Couple dissolved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Cancel dissolution request
router.post('/couple/dissolve/cancel', auth, async (req, res) => {
  try {
    if (!req.user.coupleId) return res.status(400).json({ message: 'Not in a couple' });
    const couple = await Couple.findById(req.user.coupleId);
    if (!couple) return res.status(404).json({ message: 'Couple not found' });

    if (!couple.dissolveRequest?.requestedBy) {
      return res.status(400).json({ message: 'No pending dissolution request' });
    }

    if (couple.dissolveRequest.requestedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the requester can cancel' });
    }

    couple.dissolveRequest = { requestedBy: null, requestedAt: null };
    await couple.save();
    res.json({ message: 'Dissolution cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Rate limit tracker for forgot-password (in-memory, resets on server restart)
const forgotPasswordAttempts = new Map();

// Forgot password - send reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    // Rate limit: max 5 requests per email per hour
    const key = email.toLowerCase().trim();
    const now = Date.now();
    const attempts = forgotPasswordAttempts.get(key) || [];
    const recent = attempts.filter((t) => now - t < 3600000);
    if (recent.length >= 5) {
      return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
    }
    recent.push(now);
    forgotPasswordAttempts.set(key, recent);

    const user = await User.findOne({ email: key });
    if (!user) {
      return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpiry = new Date(Date.now() + 3600000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'https://jairex.onrender.com'}/reset-password?token=${token}`;
    console.log(`[PASSWORD RESET] ${user.username} (${user.email}): ${resetUrl}`);

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Save push notification subscription
router.post('/push/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ message: 'Subscription required' });

    req.user.pushSubscription = subscription;
    await req.user.save();
    res.json({ message: 'Push subscription saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove push subscription
router.post('/push/unsubscribe', auth, async (req, res) => {
  try {
    req.user.pushSubscription = null;
    await req.user.save();
    res.json({ message: 'Push subscription removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get VAPID public key for push notifications
router.get('/push/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(404).json({ message: 'Push notifications not configured' });
  res.json({ vapidKey: key });
});

module.exports = router;
