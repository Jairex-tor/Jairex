const Notification = require('../models/Notification');
const User = require('../models/User');
const { notifyUserPush } = require('./push');

async function notifyUser(io, recipientId, { type = 'system', title = 'Notification', message = '', icon = '🔔', data = null } = {}) {
  if (!recipientId) return null;
  const notification = await Notification.create({
    user: recipientId,
    type,
    title,
    message,
    icon,
    data,
  });
  if (io) {
    io.to(`user-${recipientId}`).emit('new-notification', { notification });
  }
  try {
    const user = await User.findById(recipientId).select('pushSubscription');
    if (user?.pushSubscription) {
      const result = await notifyUserPush(user, { title, body: message, icon, url: data?.goalId ? '/piggybank' : '/chat' });
      if (result?.expired) {
        user.pushSubscription = null;
        await user.save();
      }
    }
  } catch { /* push is best-effort */ }
  return notification;
}

module.exports = { notifyUser };