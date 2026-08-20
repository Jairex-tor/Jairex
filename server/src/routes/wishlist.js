const express = require('express');
const WishlistItem = require('../models/WishlistItem');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple' });
    }
    const items = await WishlistItem.find({ coupleId: req.user.coupleId })
      .populate('addedBy', 'username avatar')
      .sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple' });
    }
    const { name, description, price, link, emoji, priority } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Item name required' });
    }

    const item = new WishlistItem({
      coupleId: req.user.coupleId,
      name: name.trim(),
      description: (description || '').trim(),
      price: price || null,
      link: (link || '').trim(),
      emoji: emoji || '🎁',
      addedBy: req.user._id,
      priority: priority || 'medium',
    });

    await item.save();
    await item.populate('addedBy', 'username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`couple-${req.user.coupleId}`).emit('wishlist-changed', { coupleId: req.user.coupleId });
    }

    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple' });
    }
    const item = await WishlistItem.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { name, description, price, link, emoji, priority } = req.body;
    if (name !== undefined) item.name = name.trim();
    if (description !== undefined) item.description = description.trim();
    if (price !== undefined) item.price = price;
    if (link !== undefined) item.link = link.trim();
    if (emoji !== undefined) item.emoji = emoji;
    if (priority !== undefined) item.priority = priority;

    await item.save();
    await item.populate('addedBy', 'username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`couple-${req.user.coupleId}`).emit('wishlist-changed', { coupleId: req.user.coupleId });
    }

    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:id/save', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple' });
    }
    const item = await WishlistItem.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.saved = !item.saved;
    item.savedAt = item.saved ? new Date() : null;
    await item.save();
    await item.populate('addedBy', 'username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`couple-${req.user.coupleId}`).emit('wishlist-changed', { coupleId: req.user.coupleId });
    }

    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple' });
    }
    const item = await WishlistItem.findOneAndDelete({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const io = req.app.get('io');
    if (io) {
      io.to(`couple-${req.user.coupleId}`).emit('wishlist-changed', { coupleId: req.user.coupleId });
    }

    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
