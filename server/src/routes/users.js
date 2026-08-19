const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Couple = require('../models/Couple');
const Savings = require('../models/Savings');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const gamification = require('../services/gamification');

const router = express.Router();

router.use(auth);

// Upload avatar photo
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const PUBLIC_URL_PREFIX = process.env.PUBLIC_URL || '';
    const avatar = `${PUBLIC_URL_PREFIX}/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, { avatar }, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get profile with stats + achievements
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('coupleId');

    const goals = await Savings.find({ coupleId: user.coupleId || null });
    const posts = await Post.find({ author: user._id });

    const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const goalsCompleted = goals.filter((g) => g.currentAmount >= g.targetAmount).length;
    const totalDeposits = goals.reduce((sum, g) => sum + g.transactions.length, 0);

    const { unlocked } = await gamification.computeAchievements(user._id);

    // merge achievements: stored + freshly computed
    const achievements = [...new Set([...user.achievements, ...unlocked])];

    const daysActive = Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    const profile = {
      ...user.toJSON(),
      stats: {
        totalSaved,
        goalsCompleted,
        totalDeposits,
        postsCount: posts.length,
        daysActive,
        streak: user.streak || 0,
        level: user.level,
        xp: user.xp,
      },
      achievements,
    };

    res.json({ user: profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const { username, avatar } = req.body;

    if (username && username !== req.user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    const updates = {};
    if (username) updates.username = username;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Change password
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    req.user.password = newPassword;
    await req.user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Change email
router.put('/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    const existing = await User.findOne({ email });
    if (existing && existing._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    req.user.email = email;
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Export all user data
router.get('/export', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const coupleId = user.coupleId;
    const goals = await Savings.find({ coupleId: coupleId || null });
    const posts = await Post.find({ coupleId: coupleId || null });
    const messages = await Message.find({ coupleId: coupleId || null });
    const notifications = await Notification.find({ user: user._id });

    res.json({
      user: user.toJSON(),
      couple: coupleId,
      goals,
      posts,
      messages,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete account
router.delete('/account', async (req, res) => {
  try {
    const userId = req.user._id;
    const coupleId = req.user.coupleId;

    await Message.deleteMany({ coupleId: coupleId || null });
    await Post.deleteMany({ coupleId: coupleId || null });
    await Savings.deleteMany({ coupleId: coupleId || null });
    await Notification.deleteMany({ user: userId });

    await Couple.deleteMany({ _id: coupleId });
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;