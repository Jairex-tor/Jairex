require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const savingsRoutes = require('./routes/savings');
const postsRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const challengesRoutes = require('./routes/challenges');
const groupsRoutes = require('./routes/groups');
const wishlistRoutes = require('./routes/wishlist');
const milestonesRoutes = require('./routes/milestones');
const budgetRoutes = require('./routes/budget');
const Message = require('./models/Message');
const User = require('./models/User');
const Group = require('./models/Group');
const Savings = require('./models/Savings');
const { notifyUserPush } = require('./services/push');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.set('io', io);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/couple', milestonesRoutes);
app.use('/api/budget', budgetRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve built client (production / single-service deployment)
const distPath = path.join(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && require('fs').existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  console.log('User connected:', socket.id);

  socket.join(`user-${socket.userId}`);

  // Auto-join couple room so messages are delivered even when not on Chat page
  try {
    const user = await User.findById(socket.userId).select('coupleId');
    if (user?.coupleId) {
      socket.join(`couple-${user.coupleId}`);
    }
    const groups = await Group.find({ members: socket.userId }).select('_id');
    groups.forEach((g) => socket.join(`group-${g._id}`));

    if (user?.coupleId) {
      socket.to(`couple-${user.coupleId}`).emit('partner-online', { userId: socket.userId });
    }
  } catch {}

  socket.on('join-couple', (coupleId) => {
    socket.join(`couple-${coupleId}`);
  });

  socket.on('join-group', (groupId) => {
    socket.join(`group-${groupId}`);
  });

  socket.on('chat-message', async (data) => {
    try {
      const { recipientId, text, type, mediaUrl, fileName } = data;
      const coupleId = data.coupleId;

      if (!coupleId || !recipientId) return;
      if (!text && type === 'text') return;

      const message = new Message({
        coupleId,
        sender: socket.userId,
        recipient: recipientId,
        text: text || '',
        type: type || 'text',
        mediaUrl: mediaUrl || null,
        fileName: fileName || null,
      });

      await message.save();
      await message.populate('sender', 'username avatar');
      await message.populate('recipient', 'username avatar');

      io.to(`couple-${coupleId}`).emit('new-message', { message });
    } catch (err) {
      console.error('chat-message error:', err.message);
    }
  });

  socket.on('message-reaction', (data) => {
    const { coupleId } = data;
    if (coupleId) {
      io.to(`couple-${coupleId}`).emit('message-reaction', data);
    }
  });

  socket.on('savings-update', (data) => {
    io.to(`couple-${data.coupleId}`).emit('goal-updated', data);
  });

  socket.on('notification', (data) => {
    io.to(`couple-${data.coupleId}`).emit('new-notification', data);
  });

  socket.on('typing-start', (data) => {
    const { coupleId } = data;
    if (coupleId) {
      socket.to(`couple-${coupleId}`).emit('partner-typing', { userId: socket.userId, typing: true });
    }
  });

  socket.on('typing-stop', (data) => {
    const { coupleId } = data;
    if (coupleId) {
      socket.to(`couple-${coupleId}`).emit('partner-typing', { userId: socket.userId, typing: false });
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    try {
      const user = await User.findById(socket.userId).select('coupleId');
      if (user?.coupleId) {
        socket.to(`couple-${user.coupleId}`).emit('partner-typing', { userId: socket.userId, typing: false });
        socket.to(`couple-${user.coupleId}`).emit('partner-offline', { userId: socket.userId });
      }
    } catch {}
  });
});

// Recurring auto-deposit scheduler — runs every hour
async function processRecurringDeposits() {
  try {
    const now = new Date();
    const goals = await Savings.find({ 'recurring.enabled': true, 'recurring.nextDeposit': { $lte: now } });
    for (const goal of goals) {
      // Skip completed goals
      if (goal.currentAmount >= goal.targetAmount) {
        goal.recurring.enabled = false;
        goal.recurring.nextDeposit = null;
        await goal.save();
        continue;
      }

      goal.transactions.push({
        amount: goal.amountPerDeposit,
        note: 'Auto-deposit',
        addedBy: goal.userId,
      });
      goal.currentAmount += goal.amountPerDeposit;

      const intervals = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
      const next = new Date(now);
      next.setDate(next.getDate() + (intervals[goal.recurring.frequency] || 7));
      goal.recurring.nextDeposit = next;

      await goal.save();

      // Update streak for auto-deposit + send push
      try {
        const user = await User.findById(goal.userId);
        if (user) {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const lastDeposit = user.lastDepositDate ? new Date(user.lastDepositDate) : null;
          const lastDay = lastDeposit ? new Date(lastDeposit.getFullYear(), lastDeposit.getMonth(), lastDeposit.getDate()) : null;
          const dayDiff = lastDay ? Math.floor((today - lastDay) / 86400000) : -1;
          if (dayDiff > 0) user.streak = (user.streak || 0) + 1;
          else if (dayDiff < 0) user.streak = 1;
          user.lastDepositDate = now;
          if ((user.streak || 0) > (user.bestStreak || 0)) user.bestStreak = user.streak;
          await user.save();

          // Send push notification
          try {
            await notifyUserPush(user, {
              title: 'Auto-Deposit',
              body: `${goal.amountPerDeposit} was deposited to "${goal.goalName}"`,
              icon: '🪙',
              url: '/piggybank',
            });
          } catch { /* push is best-effort */ }
        }
      } catch { /* streak + push is non-critical */ }

      if (io) {
        if (goal.groupId) io.to(`group-${goal.groupId}`).emit('savings-changed', { groupId: goal.groupId });
        else if (goal.coupleId) io.to(`couple-${goal.coupleId}`).emit('savings-changed', { coupleId: goal.coupleId });
      }

      console.log(`[AUTO-DEPOSIT] Goal "${goal.goalName}" +${goal.amountPerDeposit} (next: ${next.toDateString()})`);
    }
  } catch (err) {
    console.error('Recurring deposit error:', err.message);
  }
}
setInterval(processRecurringDeposits, 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/couplesave')
  .then(async () => {
    console.log('Connected to MongoDB');
    await challengesRoutes.seedChallenges();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});
