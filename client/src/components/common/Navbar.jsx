import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import NotificationBell from './NotificationBell';
import { playClick } from '../../utils/sounds';
import { PixelAvatar } from '../../utils/avatar';

const TABS = [
  {
    key: 'profile',
    label: 'PROFILE',
    path: '/profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: 'piggy',
    label: 'PIGGY B.',
    path: '/piggybank',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C9 2 6.5 4 6 7c-.3 1.5.2 3 1 4l-1 5c0 1 .5 2 1.5 2h9c1 0 1.5-1 1.5-2l-1-5c.8-1 1.3-2.5 1-4-.5-3-3-5-6-5zm-2 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      </svg>
    ),
  },
  {
    key: 'fyp',
    label: 'FYP',
    path: '/fyp',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <path d="M3 10h18M7 15h6" />
      </svg>
    ),
  },
  {
    key: 'chats',
    label: 'CHATS',
    path: '/chat',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'SETTINGS',
    path: '/settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const signOutTab = {
  key: 'signout',
  label: 'SIGN OUT',
  icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

export default function Navbar({ onSignOut, collapsed = false, onToggleCollapse, mobileOpen = false, onCloseMobile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currency } = useSettings();

  const toggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
  };

  const handleTabClick = (tab) => {
    playClick();
    if (tab.key === 'signout') {
      if (onSignOut) onSignOut();
      return;
    }
    if (onCloseMobile) onCloseMobile();
    if (tab.path) navigate(tab.path);
  };

  const isActive = (tab) => {
    if (tab.key === 'signout') return false;
    return location.pathname === tab.path;
  };

  const width = collapsed ? 72 : 216;

  return (
    <nav
      className={`app-nav${mobileOpen ? ' app-nav--open' : ''}`}
      style={{
        ...styles.nav,
        width,
      }}
      aria-label="Main navigation"
    >
      {/* Logo / toggle row */}
      <div style={styles.logoRow}>
        <button onClick={toggleCollapse} style={styles.toggleBtn} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {collapsed ? (
              <path d="M3 6h18M3 12h18M3 18h18" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <div style={{ ...styles.logoText, display: collapsed ? 'none' : 'flex' }}>
          <span style={{ fontSize: '14px' }}>🐷</span>
          <span>Jairex</span>
        </div>
        {mobileOpen && (
          <button
            onClick={() => onCloseMobile && onCloseMobile()}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px 8px',
            }}
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab)}
              style={{
                ...styles.tab,
                ...(active ? styles.tabActive : {}),
              }}
              aria-label={tab.label}
              title={tab.label}
            >
              <span
                style={{
                  ...styles.icon,
                  ...(active ? styles.iconActive : {}),
                }}
              >
                {tab.icon}
              </span>
              {!collapsed && (
                <span
                  style={{
                    ...styles.label,
                    ...(active ? styles.labelActive : {}),
                  }}
                >
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}

        <div style={styles.spacer} />

        {/* Notifications */}
        <div style={{ padding: collapsed ? '6px 0' : '6px 12px', flexShrink: 0 }}>
          <NotificationBell collapsed={collapsed} />
        </div>

        {/* User info */}
        <div style={{ ...styles.userInfo, padding: collapsed ? '10px 0' : '10px 12px' }}>
          <div style={styles.avatar}>
            <PixelAvatar avatar={user?.avatar} username={user?.username} size={36} fontSize={18} />
          </div>
          {!collapsed && (
            <div style={styles.userText}>
              <div style={styles.username}>{user?.username || 'Player'}</div>
              <div style={{ ...styles.userCurr, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{currency.symbol} {currency.code}</span>
                {user?.streak > 0 && (
                  <span title={`${user.streak} day streak`}>· 🔥{user.streak}</span>
                )}
                <span style={{ color: '#7F7F7F' }}>·</span>
                <span style={{ color: '#55FFFF' }}>LVL {user?.level || 1}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => handleTabClick(signOutTab)}
          style={{ ...styles.tab, ...styles.tabSignOut }}
          aria-label="Sign out"
          title="Sign out"
        >
          <span style={{ ...styles.icon, ...styles.iconSignOut }}>{signOutTab.icon}</span>
          {!collapsed && <span style={{ ...styles.label, ...styles.labelSignOut }}>{signOutTab.label}</span>}
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 9000,
    backgroundColor: '#1B1029',
    borderRight: '3px solid #5A5A5A',
    boxShadow: '3px 0 0 #333, 6px 0 0 rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    borderBottom: '3px solid #5A5A5A',
    backgroundColor: 'rgba(0,0,0,0.25)',
    flexShrink: 0,
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: '#7F7F7F',
    border: 'none',
    borderTop: '3px solid #B0B0B0',
    borderLeft: '3px solid #B0B0B0',
    borderBottom: '3px solid #4A4A4A',
    borderRight: '3px solid #4A4A4A',
    cursor: 'pointer',
    color: '#fff',
    flexShrink: 0,
  },
  toggleBtnActive: {
    borderTop: '3px solid #4A4A4A',
    borderLeft: '3px solid #4A4A4A',
    borderBottom: '3px solid #B0B0B0',
    borderRight: '3px solid #B0B0B0',
  },
  logoText: {
    alignItems: 'center',
    gap: '6px',
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '10px',
    color: '#FCDB05',
    textShadow: '1px 1px 0 #3F3F3F',
    whiteSpace: 'nowrap',
  },
  tabs: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
    gap: '2px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '12px 18px',
    color: '#999',
    transition: 'color 0.15s, background-color 0.15s',
    position: 'relative',
    textAlign: 'left',
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '8px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tabActive: {
    color: '#FCDB05',
    backgroundColor: 'rgba(252, 219, 5, 0.08)',
    boxShadow: 'inset 3px 0 0 #FCDB05',
  },
  tabSignOut: {
    color: '#FF4444',
    flexShrink: 0,
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    transition: 'filter 0.15s',
    flexShrink: 0,
  },
  iconActive: {
    filter: 'drop-shadow(0 0 6px rgba(252, 219, 5, 0.6))',
  },
  iconSignOut: {
    color: '#FF4444',
  },
  label: {
    color: 'inherit',
    letterSpacing: '0.5px',
    lineHeight: 1,
  },
  labelActive: {
    color: '#FCDB05',
    textShadow: '0 0 8px rgba(252, 219, 5, 0.5)',
  },
  labelSignOut: {
    color: '#FF4444',
  },
  spacer: {
    flex: 1,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderTop: '3px solid #5A5A5A',
    flexShrink: 0,
  },
  avatar: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#7F7F7F',
    borderTop: '3px solid #B0B0B0',
    borderLeft: '3px solid #B0B0B0',
    borderBottom: '3px solid #4A4A4A',
    borderRight: '3px solid #4A4A4A',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    imageRendering: 'pixelated',
  },
  userText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  username: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '8px',
    color: '#fff',
    textShadow: '1px 1px 0 #3F3F3F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userCurr: {
    fontFamily: "'VT323', monospace",
    fontSize: '14px',
    color: '#FCDB05',
  },
};