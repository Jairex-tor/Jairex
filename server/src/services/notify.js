const Notification = require('../models/Notification');

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
  return notification;
}

module.exports = { notifyUser };