const express = require('express');
const Challenge = require('../models/Challenge');
const auth = require('../middleware/auth');
const gamification = require('../services/gamification');

const router = express.Router();

router.use(auth);

const JOIN_XP = 10;

// List all challenges with joined flag + member counts
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find({}).sort({ createdAt: 1 });
    const list = challenges.map((c) => ({
      ...c.toObject(),
      members: c.participants.length,
      joined: c.participants.some((p) => p.toString() === req.user._id.toString()),
    }));
    res.json({ challenges: list });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a custom challenge
router.post('/', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Challenge name required' });
    }

    const key = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const challenge = new Challenge({
      key,
      name: name.trim().slice(0, 60),
      description: (description || '').trim().slice(0, 200),
      icon: icon || '🎯',
      custom: true,
      createdBy: req.user._id,
      participants: [req.user._id],
    });
    await challenge.save();

    const io = req.app.get('io');
    await gamification.addXP(req.user._id, JOIN_XP, io);

    res.status(201).json({ challenge: { ...challenge.toObject(), members: 1, joined: true } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Join a challenge
router.post('/:key/join', async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ key: req.params.key });
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (challenge.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.json({ challenge: challenge.toObject() });
    }

    challenge.participants.push(req.user._id);
    await challenge.save();

    const io = req.app.get('io');
    await gamification.addXP(req.user._id, JOIN_XP, io);

    res.json({ challenge: challenge.toObject() });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Leave a challenge
router.post('/:key/leave', async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ key: req.params.key });
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    challenge.participants = challenge.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );
    await challenge.save();

    res.json({ challenge: challenge.toObject() });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const DEFAULT_CHALLENGES = [
  {
    key: 'no-spend-nov',
    name: 'No-Spend November',
    icon: '🚫',
    description: 'Challenge yourself to only buy essentials this month!',
  },
  {
    key: '52-week',
    name: '52-Week Savings Challenge',
    icon: '📅',
    description: 'Save $1 in week 1, $2 in week 2, and so on. By December you\'ll have $1,378!',
  },
  {
    key: 'coffee-budget',
    name: 'Coffee Budget Challenge',
    icon: '☕',
    description: 'Skip 3 coffees a week and save $200+ a month!',
  },
  {
    key: 'dine-in',
    name: 'Dine-In & Save',
    icon: '🍳',
    description: 'Cook at home 5 nights a week and watch your savings grow.',
  },
  {
    key: 'phone-free',
    name: 'Phone-Free Evenings',
    icon: '📵',
    description: 'No phone after 8pm. Put that screen-time money in the pig!',
  },
];

async function seedChallenges() {
  for (const c of DEFAULT_CHALLENGES) {
    const exists = await Challenge.findOne({ key: c.key });
    if (!exists) {
      await Challenge.create(c);
    }
  }
}

module.exports = router;
module.exports.seedChallenges = seedChallenges;