const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@jairex.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

async function sendPushNotification(subscription, payload) {
  if (!subscription || !VAPID_PUBLIC_KEY) return false;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { expired: true };
    }
    console.error('Push notification error:', err.message);
    return false;
  }
}

async function notifyUserPush(user, payload) {
  if (!user?.pushSubscription) return false;
  return sendPushNotification(user.pushSubscription, payload);
}

module.exports = { sendPushNotification, notifyUserPush };
