import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useSocket from '../../hooks/useSocket';
import { playNotification } from '../../utils/sounds';

const ROUTE_MAP = {
  partner: '/chat',
  achievement: '/profile',
  goal: '/piggybank',
  chat: '/chat',
  post: '/fyp',
  system: '/profile',
};

function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now - date) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString();
}

export default function NotificationBell({ collapsed = false }) {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(null);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Listen for realtime notifications
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      const notif = payload?.notification || payload;
      if (notif) {
        setNotifications((prev) => [notif, ...prev].slice(0, 50));
        setUnread((prev) => prev + 1);
        playNotification();
        setFlash(notif);
        window.setTimeout(() => setFlash((f) => (f && f._id === notif._id ? null : f)), 3500);
      }
    };
    socket.on('new-notification', handler);
    return () => socket.off('new-notification', handler);
  }, [socket]);

  const handleMarkRead = async (id) => {
    try {
      await api.post('/notifications/read', { ids: [id] });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleOpen = () => {
    if (!open && unread > 0) {
      api.post('/notifications/read').catch(() => {});
    }
    setOpen(!open);
  };

  const handleClick = (n) => {
    handleMarkRead(n._id);
    setOpen(false);
    const path = ROUTE_MAP[n.type] || '/profile';
    navigate(path);
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: open ? '#FCDB05' : '#999',
          position: 'relative',
          margin: '0 auto',
          fontSize: '20px',
        }}
        aria-label="Notifications"
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              borderRadius: '8px',
              backgroundColor: '#FF4444',
              color: '#fff',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '7px',
              lineHeight: '16px',
              textAlign: 'center',
              boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            left: collapsed ? '8px' : '50%',
            transform: collapsed ? 'none' : 'translateX(-50%)',
            width: '280px',
            maxHeight: '380px',
            overflowY: 'auto',
            backgroundColor: '#1B1029',
            border: '3px solid #5A5A5A',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.4)',
            zIndex: 9500,
            borderRadius: '2px',
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '9px',
              color: '#FCDB05',
              padding: '12px',
              borderBottom: '3px solid #5A5A5A',
              backgroundColor: 'rgba(0,0,0,0.25)',
              textShadow: '1px 1px 0 #3F3F3F',
            }}
          >
            NOTIFICATIONS
          </div>
          {notifications.length === 0 && (
            <div
              style={{
                fontFamily: "'VT323', monospace",
                fontSize: '18px',
                color: '#888',
                padding: '20px 12px',
                textAlign: 'center',
              }}
            >
              All quiet. No notifications.
            </div>
          )}
          {notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                background: n.read ? 'transparent' : 'rgba(252, 219, 5, 0.06)',
                border: 'none',
                borderBottom: '2px solid rgba(90,90,90,0.6)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{n.icon || '🔔'}</span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '7px',
                    color: n.read ? '#AAA' : '#fff',
                    textShadow: '1px 1px 0 #3F3F3F',
                    marginBottom: '4px',
                    lineHeight: '1.8',
                  }}
                >
                  {n.title}
                </div>
                <div
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: '16px',
                    color: '#999',
                    lineHeight: '1.3',
                    wordBreak: 'break-word',
                  }}
                >
                  {n.message}
                </div>
                <div
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: '14px',
                    color: '#666',
                    marginTop: '4px',
                  }}
                >
                  {formatRelative(n.createdAt)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Transient notification popup */}
      {flash && (
        <div
          onClick={() => {
            handleMarkRead(flash._id);
            const path = ROUTE_MAP[flash.type] || '/profile';
            navigate(path);
          }}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 13000,
            maxWidth: '300px',
            background: 'linear-gradient(180deg, #143A2A, #0E2B1F)',
            border: '3px solid #5A5A5A',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.5)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: 'pointer',
            animation: 'gamToastIn 0.25s ease-out',
          }}
        >
          <span style={{ fontSize: '24px', lineHeight: 1, flexShrink: 0 }}>{flash.icon || '🔔'}</span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#55FF55',
                textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
                marginBottom: '4px',
              }}
            >
              {flash.title}
            </div>
            <div
              style={{
                fontFamily: "'VT323', monospace",
                fontSize: '18px',
                color: '#fff',
                lineHeight: '1.2',
                wordBreak: 'break-word',
              }}
            >
              {flash.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}