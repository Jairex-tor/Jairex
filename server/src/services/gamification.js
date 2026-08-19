const User = require('../models/User');
const Savings = require('../models/Savings');
const Post = require('../models/Post');
const { notifyUser } = require('./notify');

const XP = {
  DAILY_LOGIN: 5,
  STREAK: 5,
  DEPOSIT: 10,
  CREATE_GOAL: 15,
  COMPLETE_GOAL: 50,
  CREATE_POST: 10,
  COMMENT: 5,
  RECEIVE_REACTION: 2,
};

const ACHIEVEMENT_DEFS = {
  first_deposit: { name: 'First Deposit', icon: '🪙', desc: 'Make your first deposit' },
  goal_setter: { name: 'Goal Setter', icon: '🎯', desc: 'Create your first savings goal' },
  hundred_club: { name: '100 Club', icon: '💯', desc: 'Save $100 total' },
  week_warrior: { name: 'Week Warrior', icon: '🔥', desc: '7-day savings streak' },
  piggy_master: { name: 'Piggy Master', icon: '🐷', desc: 'Complete all goals' },
  social_butterfly: { name: 'Social Butterfly', icon: '📱', desc: 'Send 10 posts' },
};

async function computeAchievements(userId) {
  const goals = await Savings.find({ userId });
  const posts = await Post.find({ author: userId });

  const totalDeposits = goals.reduce((sum, g) => sum + g.transactions.length, 0);
  const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const allGoalsComplete =
    goals.length > 0 && goals.every((g) => g.currentAmount >= g.targetAmount);

  const unlocked = [];

  if (totalDeposits >= 1) unlocked.push('first_deposit');
  if (goals.length >= 1) unlocked.push('goal_setter');
  if (totalSaved >= 100) unlocked.push('hundred_club');
  if (allGoalsComplete) unlocked.push('piggy_master');
  if (posts.length >= 10) unlocked.push('social_butterfly');

  return { unlocked, stats: { totalDeposits, totalSaved, goalsCount: goals.length, postsCount: posts.length } };
}

async function evaluateStreak(user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!user.lastActiveDate) {
    user.lastActiveDate = today;
    user.streak = 1;
    await user.save();
    return { newStreak: 1, isNewDay: true };
  }

  const last = new Date(user.lastActiveDate);
  last.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { newStreak: user.streak, isNewDay: false };
  }

  if (diffDays === 1) {
    user.streak += 1;
    user.lastActiveDate = today;
    await user.save();
    return { newStreak: user.streak, isNewDay: true };
  }

  user.streak = 1;
  user.lastActiveDate = today;
  await user.save();
  return { newStreak: 1, isNewDay: true };
}

async function addXP(userId, amount) {
  const user = await User.findById(userId);
  if (!user) return null;
  const prevLevel = user.level;
  user.xp += amount;
  await user.save();
  const newLevel = user.level;
  return { user, leveledUp: newLevel > prevLevel, prevLevel, newLevel };
}

async function grantAchievement(userId, key, io) {
  const user = await User.findById(userId);
  if (!user) return { awarded: false, user: null };
  if (user.achievements.includes(key)) return { awarded: false, user };
  user.achievements.push(key);
  user.xp += 25;
  await user.save();
  const def = ACHIEVEMENT_DEFS[key];
  if (def) {
    await notifyUser(io, userId, {
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: `${def.name} — ${def.desc}`,
      icon: def.icon,
      data: { key },
    });
  }
  return { awarded: true, user };
}

module.exports = {
  XP,
  ACHIEVEMENT_DEFS,
  computeAchievements,
  evaluateStreak,
  addXP,
  grantAchievement,
};