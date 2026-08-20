const express = require('express');
const Couple = require('../models/Couple');
const Savings = require('../models/Savings');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const MILESTONES = [
  { days: 1, name: 'First Day', icon: '🌱', xp: 50 },
  { days: 7, name: 'One Week!', icon: '🗓️', xp: 100 },
  { days: 30, name: 'One Month!', icon: '🌙', xp: 200 },
  { days: 60, name: 'Two Months!', icon: '⭐', xp: 300 },
  { days: 100, name: '100 Days!', icon: '💯', xp: 50 },
  { days: 180, name: 'Half Year!', icon: '🏅', xp: 500 },
  { days: 365, name: 'One Year!', icon: '👑', xp: 1000 },
  { days: 730, name: 'Two Years!', icon: '💎', xp: 2000 },
];

router.get('/milestones', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.json({ milestones: [], nextMilestone: MILESTONES[0], daysTogether: 0 });
    }
    const couple = await Couple.findById(req.user.coupleId);
    if (!couple) return res.status(404).json({ message: 'Couple not found' });

    const startDate = couple.anniversaryDate || couple.createdAt;
    const now = new Date();
    const daysTogether = Math.floor((now - startDate) / 86400000);

    const achieved = [];
    let nextMilestone = MILESTONES[0];
    for (const m of MILESTONES) {
      if (daysTogether >= m.days) {
        achieved.push({ ...m, achieved: true });
      } else {
        if (!nextMilestone || m.days < nextMilestone.days) {
          nextMilestone = m;
        }
      }
    }

    const nextIdx = MILESTONES.findIndex((m) => m.days > daysTogether);
    nextMilestone = nextIdx >= 0 ? MILESTONES[nextIdx] : null;

    res.json({ milestones: achieved, nextMilestone, daysTogether, startDate });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/anniversary', async (req, res) => {
  try {
    if (!req.user.coupleId) {
      return res.status(400).json({ message: 'Must be in a couple' });
    }
    const couple = await Couple.findById(req.user.coupleId);
    if (!couple) return res.status(404).json({ message: 'Couple not found' });

    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Date required' });

    couple.anniversaryDate = new Date(date);
    await couple.save();

    res.json({ couple });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentDeposits = await Savings.aggregate([
      { $unwind: '$transactions' },
      { $match: { 'transactions.date': { $gte: weekAgo } } },
      {
        $group: {
          _id: '$coupleId',
          totalSaved: { $sum: '$transactions.amount' },
          depositCount: { $sum: 1 },
        },
      },
      { $sort: { totalSaved: -1 } },
      { $limit: 20 },
    ]);

    const coupleIds = recentDeposits.map((d) => d._id).filter(Boolean);
    const couples = await Couple.find({ _id: { $in: coupleIds } })
      .populate('partner1', 'username avatar')
      .populate('partner2', 'username avatar');

    const coupleMap = {};
    couples.forEach((c) => { coupleMap[c._id.toString()] = c; });

    const leaderboard = recentDeposits
      .filter((d) => coupleMap[d._id?.toString()])
      .map((d, idx) => {
        const couple = coupleMap[d._id.toString()];
        const p1 = couple.partner1;
        const p2 = couple.partner2;
        return {
          rank: idx + 1,
          coupleId: d._id,
          partner1: p1 ? { username: p1.username, avatar: p1.avatar } : null,
          partner2: p2 ? { username: p2.username, avatar: p2.avatar } : null,
          totalSaved: d.totalSaved,
          depositCount: d.depositCount,
        };
      });

    let myRank = null;
    if (req.user.coupleId) {
      const myIdx = leaderboard.findIndex(
        (l) => l.coupleId.toString() === req.user.coupleId.toString()
      );
      myRank = myIdx >= 0 ? leaderboard[myIdx] : null;

      if (!myRank) {
        const myData = recentDeposits.find(
          (d) => d._id?.toString() === req.user.coupleId.toString()
        );
        if (myData) {
          const couple = await Couple.findById(req.user.coupleId)
            .populate('partner1', 'username avatar')
            .populate('partner2', 'username avatar');
          if (couple) {
            myRank = {
              rank: leaderboard.length + 1,
              coupleId: req.user.coupleId,
              partner1: couple.partner1 ? { username: couple.partner1.username, avatar: couple.partner1.avatar } : null,
              partner2: couple.partner2 ? { username: couple.partner2.username, avatar: couple.partner2.avatar } : null,
              totalSaved: myData.totalSaved,
              depositCount: myData.depositCount,
            };
          }
        }
      }
    }

    res.json({ leaderboard, myRank });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
