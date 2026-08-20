import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/common/Button';
import BlockCard from '../components/common/BlockCard';
import Input from '../components/common/Input';
import ProgressBar from '../components/common/ProgressBar';
import MinecraftCharacter from '../components/common/MinecraftCharacter';
import { PixelAvatar } from '../utils/avatar';
import { playDeposit, playClick } from '../utils/sounds';
import useSocket from '../hooks/useSocket';

const PIXEL_AVATARS = [
  '🧑‍🌾', '👩‍🌾', '⛏️', '🗡️', '🛡️', '🧙',
  '🧝', '🧟', '👑', '💎', '🐷', '🐉',
  '🦊', '🐺', '🦁', '🐸', '👾', '🤖',
];

const ACHIEVEMENTS = [
  { key: 'first_deposit', icon: '🪙', name: 'First Deposit', desc: 'Make your first deposit' },
  { key: 'goal_setter', icon: '🎯', name: 'Goal Setter', desc: 'Create your first savings goal' },
  { key: 'hundred_club', icon: '💯', name: '100 Club', desc: 'Save $100 total' },
  { key: 'week_warrior', icon: '🔥', name: 'Week Warrior', desc: '7-day savings streak' },
  { key: 'piggy_master', icon: '🐷', name: 'Piggy Master', desc: 'Complete all goals' },
  { key: 'social_butterfly', icon: '📱', name: 'Social Butterfly', desc: 'Send 10 posts' },
];

function achievementProgress(key, stats) {
  switch (key) {
    case 'first_deposit': {
      const done = Math.min(stats.totalDeposits || 0, 1);
      return { pct: done / 1, label: `${done}/1 deposit` };
    }
    case 'goal_setter': {
      const done = Math.min(stats.goalsCount || 0, 1);
      return { pct: done / 1, label: `${done}/1 goal` };
    }
    case 'hundred_club': {
      const done = Math.min(stats.totalSaved || 0, 100);
      return { pct: done / 100, label: `${Math.round(done)}/100 saved` };
    }
    case 'week_warrior': {
      const done = Math.min(stats.streak || 0, 7);
      return { pct: done / 7, label: `${done}/7 days` };
    }
    case 'piggy_master': {
      const total = stats.goalsCount || 0;
      const done = Math.min(stats.goalsCompleted || 0, total);
      return { pct: total > 0 ? done / total : 0, label: `${done}/${total} goals` };
    }
    case 'social_butterfly': {
      const done = Math.min(stats.postsCount || 0, 10);
      return { pct: done / 10, label: `${done}/10 posts` };
    }
    default:
      return { pct: 0, label: '' };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { formatCurrency } = useSettings();
  const [profile, setProfile] = useState(null);
  const [coupleInfo, setCoupleInfo] = useState(null);
  const [stats, setStats] = useState({ totalSaved: 0, goalsCompleted: 0, goalsCount: 0, totalDeposits: 0, postsCount: 0, daysActive: 0, streak: 0, bestStreak: 0 });
  const [achievements, setAchievements] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', avatar: '' });
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [joiningPartner, setJoiningPartner] = useState(false);
  const [customInviteCode, setCustomInviteCode] = useState('');
  const [dissolveLoading, setDissolveLoading] = useState(null);
  const { socket } = useSocket();
  const avatarInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = data.user || data;
      setProfile((prev) => ({ ...prev, ...updated, avatar: updated.avatar }));
      setEditForm((f) => ({ ...f, avatar: updated.avatar }));
      playDeposit();
      refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileRes, coupleRes] = await Promise.allSettled([
        api.get('/users/profile'),
        api.get('/auth/couple'),
      ]);

      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value.data;
        const p = d.user || d.profile || d;
        setProfile(p);
        setStats({
          totalSaved: p.stats?.totalSaved ?? p.totalSaved ?? p.totalSavedAmount ?? 0,
          goalsCompleted: p.stats?.goalsCompleted ?? p.goalsCompleted ?? 0,
          goalsCount: p.stats?.goalsCount ?? p.goals?.length ?? p.goalsCreated ?? 0,
          totalDeposits: p.stats?.totalDeposits ?? p.totalDeposits ?? 0,
          postsCount: p.stats?.postsCount ?? p.postsCount ?? 0,
          daysActive: p.stats?.daysActive ?? p.daysActive ?? 0,
          streak: p.stats?.streak ?? p.streak ?? p.currentStreak ?? 0,
          bestStreak: p.stats?.bestStreak ?? p.bestStreak ?? 0,
        });
        setAchievements(p.achievements || []);
        setEditForm({ username: p.username || user?.username || '', avatar: p.avatar || user?.avatar || '🧑‍🌾' });
      }

      if (coupleRes.status === 'fulfilled') {
        const cd = coupleRes.value.data;
        setCoupleInfo(cd.couple || cd);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleEditToggle = () => {
    if (!editing) {
      setEditForm({
        username: profile?.username || user?.username || '',
        avatar: profile?.avatar || user?.avatar || '🧑‍🌾',
      });
    }
    setEditing(!editing);
  };

  const handleSaveProfile = async () => {
    try {
      setError(null);
      const { data } = await api.put('/users/profile', editForm);
      const updated = data.user || data.profile || data;
      setProfile((prev) => ({ ...prev, ...updated, ...editForm }));
      setEditing(false);
      refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      setCopyFeedback(false);
    }
  };

  const handleJoinPartner = async () => {
    if (!joinCode.trim()) return;
    try {
      setError(null);
      setJoiningPartner(true);
      await api.post('/auth/couple/join', { inviteCode: joinCode.trim() });
      setJoinCode('');
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join partner');
    } finally {
      setJoiningPartner(false);
    }
  };

  const handleDissolveRequest = async () => {
    try {
      setDissolveLoading('request');
      setError(null);
      await api.post('/auth/couple/dissolve/request');
      await fetchProfile();
      playClick();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request dissolution');
    } finally {
      setDissolveLoading(null);
    }
  };

  const handleDissolveApprove = async () => {
    try {
      setDissolveLoading('approve');
      setError(null);
      await api.post('/auth/couple/dissolve/approve');
      await fetchProfile();
      playClick();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve dissolution');
    } finally {
      setDissolveLoading(null);
    }
  };

  const handleDissolveCancel = async () => {
    try {
      setDissolveLoading('cancel');
      setError(null);
      await api.post('/auth/couple/dissolve/cancel');
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setDissolveLoading(null);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setError(null);
      setGeneratingInvite(true);
      const payload = customInviteCode.trim() ? { customCode: customInviteCode.trim() } : {};
      const { data } = await api.post('/auth/couple/invite', payload);
      setInviteCode(data.inviteCode || data.code || '');
      setCustomInviteCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate invite code');
    } finally {
      setGeneratingInvite(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchProfile();
    socket.on('new-notification', refresh);
    return () => socket.off('new-notification', refresh);
  }, [socket]);

  const displayProfile = profile || user || {};
  const avatar = editing ? editForm.avatar : (displayProfile.avatar || '🧑‍🌾');
  const username = editing ? editForm.username : (displayProfile.username || 'Player');
  const isUnlocked = (key) => achievements.includes(key);

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-title">Profile</div>
        <div className="page__header-actions">
          {!editing ? (
            <Button variant="secondary" size="sm" onClick={handleEditToggle}>
              Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={handleEditToggle}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="page__body page__body--narrow">
        {loading ? (
          <div className="profile">
            <div className="profile__header-card">
              <div className="skeleton" style={{ width: '80px', height: '80px', margin: '0 auto 16px' }} />
              <div className="skeleton skeleton--title" style={{ margin: '0 auto', width: '160px' }} />
              <div className="skeleton skeleton--text" style={{ margin: '12px auto 0', width: '120px' }} />
            </div>
            <div className="profile__stats">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="profile__stat">
                  <div className="skeleton skeleton--text" style={{ width: '50px', margin: '0 auto 4px' }} />
                  <div className="skeleton skeleton--text" style={{ width: '70px', margin: '0 auto', height: '14px' }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="profile">
            {/* Error */}
            {error && (
              <div
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  padding: '12px 16px',
                  background: 'rgba(255, 0, 0, 0.12)',
                  border: '2px solid rgba(255, 0, 0, 0.3)',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  color: 'var(--mc-redstone)',
                  textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  animation: 'slide-up 0.3s ease-out',
                }}
              >
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  style={{
                    color: 'var(--mc-redstone)',
                    cursor: 'pointer',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '8px',
                    background: 'none',
                    border: 'none',
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Header Card */}
            <div className="profile__header-card">
              {editing ? (
                <>
                  <div className="profile__avatar">
                    <PixelAvatar avatar={editForm.avatar} username={editForm.username} size={80} fontSize={40} />
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    {PIXEL_AVATARS.map((a) => (
                      <div
                        key={a}
                        onClick={() => setEditForm((f) => ({ ...f, avatar: a }))}
                        className={`mc-slot mc-slot--small${editForm.avatar === a ? ' mc-slot--selected' : ''}`}
                        style={{ fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {a}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    style={{ marginBottom: '16px' }}
                  >
                    {uploadingAvatar ? 'Uploading...' : '📷 Upload Photo'}
                  </Button>
                  <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                    <Input
                      label="Username"
                      value={editForm.username}
                      onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder="Enter username"
                      name="username"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="profile__avatar">
                    <PixelAvatar avatar={avatar} username={username} size={80} fontSize={40} />
                  </div>
                  <div className="profile__username">{username}</div>
                  <div
                    style={{
                      fontFamily: "'VT323', monospace",
                      fontSize: '20px',
                      color: '#AAA',
                    }}
                  >
                    Member since {formatDate(displayProfile.createdAt || displayProfile.joinDate)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      marginTop: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '9px',
                        color: 'var(--mc-diamond)',
                        textShadow: '1px 1px 0 var(--mc-text-shadow)',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '6px 10px',
                        border: '2px solid var(--mc-border-dark)',
                      }}
                    >
                      LVL {displayProfile.level || 1}
                    </div>
                    <div
                      style={{
                        width: '180px',
                        height: '14px',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        border: '2px solid var(--mc-border-dark)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, ((displayProfile.xp || 0) % 100) / 100 * 100)}%`,
                          height: '100%',
                          backgroundColor: 'var(--mc-emerald)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Stats Grid */}
            <div className="profile__stats">
              <div className="profile__stat">
                <div className="profile__stat-value">{formatCurrency(stats.totalSaved)}</div>
                <div className="profile__stat-label">Total Saved</div>
              </div>
              <div className="profile__stat">
                <div className="profile__stat-value">{stats.goalsCompleted}</div>
                <div className="profile__stat-label">Goals Done</div>
              </div>
              <div className="profile__stat">
                <div className="profile__stat-value">{stats.daysActive}</div>
                <div className="profile__stat-label">Days Active</div>
              </div>
              <div className="profile__stat">
                <div className="profile__stat-value" style={stats.streak > 0 ? { color: '#FFA500', textShadow: '0 0 8px rgba(255,165,0,0.5)' } : undefined}>
                  {stats.streak > 0 ? '🔥 ' : ''}{stats.streak}
                </div>
                <div className="profile__stat-label">Day Streak</div>
              </div>
              <div className="profile__stat">
                <div className="profile__stat-value">{stats.bestStreak}</div>
                <div className="profile__stat-label">Best Streak</div>
              </div>
            </div>

            {/* Partner / Couple Section */}
            <div className="profile__section">
              <div className="profile__section-title">{coupleInfo?.partner ? 'Couple' : 'Partner'}</div>
              {coupleInfo?.partner ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  {/* COUPLE label */}
                  <div
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '11px',
                      color: '#FF5555',
                      textShadow: '2px 2px 0 rgba(0,0,0,0.6), 0 0 12px rgba(255,85,85,0.4)',
                      letterSpacing: '3px',
                    }}
                  >
                    ♥ COUPLE ♥
                  </div>

                  {/* Two characters + heart HP bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {/* Me */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <MinecraftCharacter
                        avatar={user?.avatar || '🧑‍🌾'}
                        username={user?.username}
                        size={100}
                        shirt="#3F6DB3"
                        pants="#2C3E70"
                        onReact={() => playClick()}
                      />
                      <div
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: '8px',
                          color: 'var(--mc-diamond)',
                          textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                        }}
                      >
                        {user?.username || 'You'}
                      </div>
                    </div>

                    {/* Heart HP Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <svg key={i} width="14" height="14" viewBox="0 0 16 16">
                            <path
                              d="M8 14s-6-4.35-6-7.65C2 3.79 3.79 2 5.35 2 6.41 2 7.35 2.59 8 3.5 8.65 2.59 9.59 2 10.65 2 12.21 2 14 3.79 14 6.35 14 9.65 8 14 8 14z"
                              fill="#FF0000"
                              stroke="#8B0000"
                              strokeWidth="1.5"
                            />
                          </svg>
                        ))}
                      </div>
                      <div
                        style={{
                          fontFamily: "'VT323', monospace",
                          fontSize: '16px',
                          color: '#FF5555',
                        }}
                      >
                        Together since {formatDate(coupleInfo.createdAt)}
                      </div>
                    </div>

                    {/* Partner */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <MinecraftCharacter
                        avatar={coupleInfo.partner.avatar || '🧑‍🌾'}
                        username={coupleInfo.partner.username}
                        size={100}
                        shirt="#3E8948"
                        pants="#2C3E70"
                        onReact={() => playClick()}
                      />
                      <div
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: '8px',
                          color: 'var(--mc-emerald)',
                          textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                        }}
                      >
                        {coupleInfo.partner.username || 'Partner'}
                      </div>
                    </div>
                  </div>

                  {/* Dissolve request UI */}
                  {coupleInfo.dissolveRequest?.requestedBy ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px',
                        background: 'rgba(255,0,0,0.08)',
                        border: '2px solid rgba(255,85,85,0.3)',
                        width: '100%',
                        maxWidth: '360px',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: '8px',
                          color: '#FF5555',
                          textAlign: 'center',
                          lineHeight: '1.8',
                        }}
                      >
                        {coupleInfo.dissolveRequest.requestedBy === (user?._id || user?.id)
                          ? 'Dissolution requested — waiting for partner...'
                          : 'Partner wants to dissolve the couple'}
                      </div>
                      {coupleInfo.dissolveRequest.requestedBy !== (user?._id || user?.id) ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button variant="primary" size="sm" onClick={handleDissolveApprove} disabled={!!dissolveLoading}>
                            {dissolveLoading === 'approve' ? '...' : 'Accept'}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={handleDissolveCancel} disabled={!!dissolveLoading}>
                            {dissolveLoading === 'cancel' ? '...' : 'Decline'}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={handleDissolveCancel} disabled={!!dissolveLoading}>
                          {dissolveLoading === 'cancel' ? '...' : 'Cancel Request'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={handleDissolveRequest} disabled={!!dissolveLoading}>
                      {dissolveLoading === 'request' ? '...' : 'Request to Dissolve'}
                    </Button>
                  )}
                </div>
              ) : (
                <BlockCard variant="stone">
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '10px',
                        color: 'var(--mc-text)',
                        textShadow: '1px 1px 0 var(--mc-text-shadow)',
                        marginBottom: '8px',
                        lineHeight: '2',
                      }}
                    >
                      Find your savings buddy!
                    </div>

                    {/* Custom invite code section */}
                    <div style={{ marginBottom: '12px' }}>
                      <div
                        style={{
                          fontFamily: "'VT323', monospace",
                          fontSize: '18px',
                          color: '#AAA',
                          marginBottom: '8px',
                        }}
                      >
                        Set a custom code or leave blank for random:
                      </div>
                      <div style={{ display: 'flex', gap: '8px', maxWidth: '300px', margin: '0 auto 10px' }}>
                        <input
                          className="mc-input"
                          value={customInviteCode}
                          onChange={(e) => setCustomInviteCode(e.target.value.slice(0, 16))}
                          placeholder="e.g. JAIREX2026"
                          style={{ flex: 1, fontSize: '16px', padding: '10px 12px', textTransform: 'uppercase', letterSpacing: '1px' }}
                        />
                        <Button variant="gold" size="sm" onClick={handleGenerateInvite} disabled={generatingInvite}>
                          {generatingInvite ? '...' : 'Set Code'}
                        </Button>
                      </div>
                    </div>

                    {inviteCode ? (
                      <div style={{ marginBottom: '12px' }}>
                        <div
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: '14px',
                            color: 'var(--mc-diamond)',
                            textShadow: '1px 1px 0 var(--mc-text-shadow)',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '12px',
                            border: '2px solid var(--mc-border-dark)',
                            letterSpacing: '2px',
                            marginBottom: '8px',
                          }}
                        >
                          {inviteCode}
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleCopyInvite}>
                          {copyFeedback ? 'Copied!' : 'Copy Code'}
                        </Button>
                      </div>
                    ) : null}

                    <div
                      style={{
                        fontFamily: "'VT323', monospace",
                        fontSize: '18px',
                        color: '#888',
                        margin: '8px 0',
                      }}
                    >
                      — or enter a partner's code —
                    </div>
                    <div style={{ display: 'flex', gap: '8px', maxWidth: '300px', margin: '0 auto' }}>
                      <input
                        className="mc-input"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Partner's code"
                        style={{ flex: 1, fontSize: '18px', padding: '10px 12px' }}
                      />
                      <Button variant="primary" size="sm" onClick={handleJoinPartner} disabled={!joinCode.trim() || joiningPartner}>
                        {joiningPartner ? 'Joining...' : 'Join'}
                      </Button>
                    </div>
                  </div>
                </BlockCard>
              )}
            </div>

            {/* Achievements Section */}
            <div className="profile__section">
              <div className="profile__section-title">Achievements</div>
              <div className="profile__achievements">
                {ACHIEVEMENTS.map((ach) => {
                  const unlocked = isUnlocked(ach.key);
                  const { pct, label } = achievementProgress(ach.key, stats);
                  return (
                    <div
                      key={ach.key}
                      className={`profile__achievement${unlocked ? '' : ' profile__achievement--locked'}`}
                      title={ach.desc}
                    >
                      <div className="profile__achievement-icon">
                        {unlocked ? ach.icon : '🔒'}
                      </div>
                      <div className="profile__achievement-name">
                        {ach.name}
                      </div>
                      <div className="profile__achievement-progress">
                        <ProgressBar
                          value={pct * 100}
                          max={100}
                          height={8}
                          color={unlocked ? 'gold' : 'green'}
                        />
                        <div className="profile__achievement-progress-label">
                          {unlocked ? 'Unlocked ✓' : label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Logout */}
            <div style={{ marginTop: '8px' }}>
              <Button variant="danger" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
