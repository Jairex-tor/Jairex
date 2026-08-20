self.addEventListener('push', (event) => {
  let data = { title: 'Jairex', body: 'You have a new notification', icon: '/favicon.ico' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.body = event.data.text(); }
  }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: data.url || '/piggybank',
    vibrate: [100, 50, 100],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/piggybank';
  event.waitUntil(clients.matchAll({ type: 'window' }).then((windowClients) => {
    for (const client of windowClients) {
      if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
    }
    return clients.openWindow(url);
  }));
});
