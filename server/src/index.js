require('dotenv').config();
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
const Message = require('./models/Message');
const User = require('./models/User');
const Group = require('./models/Group');

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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

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
