const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Get notifications for current user
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unread = notifications.filter((n) => !n.read).length;

    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark notifications as read
router.post('/read', async (req, res) => {
  try {
    const { ids } = req.body;
    if (ids && Array.isArray(ids)) {
      await Notification.updateMany(
        { user: req.user._id, _id: { $in: ids } },
        { read: true }
      );
    } else {
      await Notification.updateMany({ user: req.user._id }, { read: true });
    }
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;