import { useState, useCallback } from 'react';
import api from '../utils/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

export default function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await api.post('/auth/push/subscribe', { subscription: existing.toJSON() });
        setSubscribed(true);
        return true;
      }

      let vapidKey = process.env.REACT_APP_VAPID_KEY || process.env.VITE_VAPID_KEY || '';
      if (!vapidKey) {
        try {
          const { data } = await api.get('/auth/push/vapid-key');
          vapidKey = data.vapidKey || '';
        } catch { /* no vapid key */ }
      }
      if (!vapidKey) {
        console.warn('VAPID key not configured, push notifications disabled');
        return false;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await api.post('/auth/push/subscribe', { subscription: sub.toJSON() });
      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscribe error:', err);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await api.post('/auth/push/unsubscribe');
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    }
  }, []);

  return { permission, subscribed, subscribe, unsubscribe };
}
