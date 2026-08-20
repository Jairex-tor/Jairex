const express = require('express');
const Savings = require('../models/Savings');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const CATEGORIES = ['food', 'entertainment', 'gifts', 'travel', 'shopping', 'bills', 'savings', 'other'];
const CATEGORY_ICONS = {
  food: '🍔', entertainment: '🎮', gifts: '🎁', travel: '✈️',
  shopping: '🛍️', bills: '📄', savings: '💰', other: '📦',
};

router.get('/breakdown', async (req, res) => {
  try {
    const coupleId = req.user.coupleId;
    if (!coupleId) {
      return res.status(400).json({ message: 'Must be in a couple' });
    }

    const goals = await Savings.find({ coupleId }).populate('transactions.addedBy', 'username avatar');
    const categoryTotals = {};
    let grandTotal = 0;

    CATEGORIES.forEach((c) => { categoryTotals[c] = { category: c, icon: CATEGORY_ICONS[c], total: 0, count: 0 }; });

    for (const goal of goals) {
      for (const tx of goal.transactions) {
        const cat = tx.category || 'savings';
        if (!categoryTotals[cat]) categoryTotals[cat] = { category: cat, icon: CATEGORY_ICONS[cat] || '📦', total: 0, count: 0 };
        categoryTotals[cat].total += tx.amount;
        categoryTotals[cat].count += 1;
        grandTotal += tx.amount;
      }
    }

    const breakdown = Object.values(categoryTotals)
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((c) => ({
        ...c,
        percentage: grandTotal > 0 ? Math.round((c.total / grandTotal) * 100) : 0,
      }));

    res.json({ breakdown, grandTotal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
