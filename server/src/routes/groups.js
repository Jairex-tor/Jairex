const express = require('express');
const Group = require('../models/Group');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.post('/', async (req, res) => {
  try {
    const { name, description, customCode } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Group name required' });

    let inviteCode;
    if (customCode && customCode.trim()) {
      if (!/^[A-Za-z0-9]{4,16}$/.test(customCode.trim())) {
        return res.status(400).json({ message: 'Code must be 4-16 letters/numbers' });
      }
      const exists = await Group.findOne({ inviteCode: customCode.trim().toUpperCase() });
      if (exists) return res.status(400).json({ message: 'Code already taken' });
      inviteCode = customCode.trim().toUpperCase();
    } else {
      inviteCode = Group.generateCode();
    }

    const group = new Group({
      name: name.trim(),
      description: (description || '').trim(),
      inviteCode,
      createdBy: req.user._id,
      members: [req.user._id],
    });
    await group.save();
    res.status(201).json({ group });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'username avatar')
      .sort({ createdAt: -1 });
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'username avatar');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((m) => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not a member' });
    }
    res.json({ group });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/join/:code', async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.code.toUpperCase() });
    if (!group) return res.status(404).json({ message: 'Invalid group code' });
    if (group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.json({ group });
    }
    group.members.push(req.user._id);
    await group.save();
    res.json({ group });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:id/leave', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    group.members = group.members.filter((m) => m.toString() !== req.user._id.toString());
    if (group.members.length === 0) {
      await group.deleteOne();
    } else {
      await group.save();
    }
    res.json({ message: 'Left group' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only creator can delete' });
    }
    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
