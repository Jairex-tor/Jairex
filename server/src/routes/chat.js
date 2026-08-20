const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
const PUBLIC_URL_PREFIX = process.env.PUBLIC_URL_PREFIX || '';

router.use(auth);

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
      .populate('recipient', 'username avatar')
      .populate('reactions.userId', 'username');

    const partner = await require('../models/User').findById(partnerId).select('username avatar');

    res.json({ messages, partner });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

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

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { recipient, type } = req.body;

    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Not in a couple' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const mediaUrl = `${PUBLIC_URL_PREFIX}/uploads/${req.file.filename}`;
    const isImage = req.file.mimetype.startsWith('image/');

    const message = new Message({
      coupleId: req.user.coupleId,
      sender: req.user._id,
      recipient,
      text: '',
      type: isImage ? 'image' : 'file',
      mediaUrl,
      fileName: req.file.originalname,
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('recipient', 'username avatar');

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:messageId/react', async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'Emoji required' });

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.coupleId?.toString() !== req.user.coupleId?.toString()) {
      return res.status(403).json({ message: 'Not your couple chat' });
    }

    const existing = message.reactions.findIndex(
      (r) => r.userId.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existing >= 0) {
      message.reactions.splice(existing, 1);
    } else {
      message.reactions.push({ emoji, userId: req.user._id });
    }

    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('reactions.userId', 'username');

    const io = req.app.get('io');
    if (io) {
      io.to(`couple-${req.user.coupleId}`).emit('message-reaction', {
        messageId: message._id,
        message,
      });
    }

    res.json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
