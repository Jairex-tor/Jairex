const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Get conversation with a partner
router.get('/messages/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const coupleId = req.user.coupleId;

    if (!coupleId) {
      return res.status(400).json({ message: 'Not in a couple' });
    }

    const messages = await Message.find({
      coupleId,
      $or: [
        { sender: req.user._id, recipient: partnerId },
        { sender: partnerId, recipient: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar');

    const partner = await require('../models/User').findById(partnerId).select('username avatar');

    res.json({ messages, partner });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get recent conversations / message previews
router.get('/conversations', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.json({ conversations: [] });
    }

    const messages = await Message.find({ coupleId: req.user.coupleId })
      .sort({ createdAt: -1 })
      .populate('sender', 'username avatar');

    res.json({ conversations: messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Save a message (used by REST fallback / coin messages)
router.post('/', async (req, res) => {
  try {
    const { recipient, text, type } = req.body;

    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Not in a couple' });
    }

    const message = new Message({
      coupleId: req.user.coupleId,
      sender: req.user._id,
      recipient,
      text: text || '',
      type: type || 'text',
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('recipient', 'username avatar');

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;