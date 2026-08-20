import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { SOUND_PACKS } from '../utils/sounds';
import { exportSavingsPDF } from '../utils/exportPDF';

function Toggle({ on, onToggle }) {
  return (
    <div
      className={`settings__toggle${on ? ' settings__toggle--on' : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    />
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        padding: '12px 20px',
        backgroundColor: 'var(--mc-grass)',
        border: '3px solid var(--mc-border-dark)',
        boxShadow: 'inset -2px -2px 0 var(--mc-border-dark), inset 2px 2px 0 var(--mc-border-light)',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '10px',
        color: 'var(--mc-text)',
        textShadow: '1px 1px 0 var(--mc-text-shadow)',
        zIndex: 200,
        animation: 'slide-up 0.3s ease-out',
      }}
    >
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { settings, updateSetting } = useSettings();
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [toast, setToast] = useState(null);
  const [coupleInfo, setCoupleInfo] = useState(null);

  // Password state
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Email change state
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const showToast = useCallback((msg) => setToast(msg), []);

  useEffect(() => {
    api.get('/auth/couple').then(({ data }) => {
      setCoupleInfo(data.couple || data);
    }).catch(() => {});
  }, []);

  const handleUpdatePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwords.current || !passwords.newPass) {
      setPasswordError('Fill in all password fields');
      return;
    }
    if (passwords.newPass.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await api.put('/users/password', {
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setPasswords({ current: '', newPass: '', confirm: '' });
      setPasswordSuccess(true);
      showToast('Password updated!');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setSaving(true);
      const { data } = await api.get('/users/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `couplesave-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Export failed');
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    try {
      setSaving(true);
      await api.delete('/savings/clear');
      showToast('Savings data cleared');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to clear data');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setSaving(true);
      await api.post('/auth/couple/disconnect');
      setCoupleInfo(null);
      showToast('Partner disconnected');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to disconnect');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return;
    try {
      setSaving(true);
      await api.delete('/users/account');
      localStorage.clear();
      logout();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account');
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-title">Settings</div>
      </div>

      <div className="page__body page__body--narrow">
        <div className="settings">
          <h2 className="settings__title">Settings</h2>

          <div className="settings__groups">
            {/* Account Section */}
            <div className="settings__group">
              <div className="settings__group-title">Account</div>

              {/* Email */}
              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Email</div>
                  <div className="settings__item-desc">{user?.email || 'Not set'}</div>
                </div>
                <div className="settings__item-control">
                  <Button variant="secondary" size="sm" onClick={() => setShowEmailChange(!showEmailChange)}>
                    Change
                  </Button>
                </div>
              </div>

              {showEmailChange && (
                <div style={{ padding: '12px 0' }}>
                  <Input
                    label="New Email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@email.com"
                    name="new-email"
                  />
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        if (!newEmail.trim()) return;
                        try {
                          await api.put('/users/email', { email: newEmail.trim() });
                          setShowEmailChange(false);
                          setNewEmail('');
                          showToast('Email updated!');
                        } catch (err) {
                          showToast(err.response?.data?.message || 'Failed to update email');
                        }
                      }}
                    >
                      Save Email
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => { setShowEmailChange(false); setNewEmail(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="mc-divider" style={{ margin: '8px 0' }} />

              {/* Change Password */}
              <div style={{ padding: '8px 0 4px' }}>
                <div className="settings__item-label" style={{ marginBottom: '12px' }}>Change Password</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Input
                    label="Current Password"
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                    placeholder="••••••••"
                    name="current-password"
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={passwords.newPass}
                    onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                    placeholder="••••••••"
                    name="new-password"
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="••••••••"
                    name="confirm-password"
                  />
                </div>

                {passwordError && (
                  <div
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px',
                      color: 'var(--mc-redstone)',
                      textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                      marginTop: '8px',
                    }}
                  >
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px',
                      color: 'var(--mc-emerald)',
                      textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                      marginTop: '8px',
                    }}
                  >
                    Password updated successfully!
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <Button variant="primary" size="sm" onClick={handleUpdatePassword} disabled={saving}>
                    Update Password
                  </Button>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="settings__group">
              <div className="settings__group-title">Notifications</div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Savings Reminders</div>
                  <div className="settings__item-desc">Daily reminders to save</div>
                </div>
                <div className="settings__item-control">
                  <Toggle
                    on={settings.notifications.savingsReminders}
                    onToggle={() => updateSetting('notifications', 'savingsReminders', !settings.notifications.savingsReminders)}
                  />
                </div>
              </div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Partner Activity</div>
                  <div className="settings__item-desc">When your partner saves</div>
                </div>
                <div className="settings__item-control">
                  <Toggle
                    on={settings.notifications.partnerActivity}
                    onToggle={() => updateSetting('notifications', 'partnerActivity', !settings.notifications.partnerActivity)}
                  />
                </div>
              </div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Achievement Unlocks</div>
                  <div className="settings__item-desc">When you earn badges</div>
                </div>
                <div className="settings__item-control">
                  <Toggle
                    on={settings.notifications.achievementUnlocks}
                    onToggle={() => updateSetting('notifications', 'achievementUnlocks', !settings.notifications.achievementUnlocks)}
                  />
                </div>
              </div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">AI Tips</div>
                  <div className="settings__item-desc">Personalized savings advice</div>
                </div>
                <div className="settings__item-control">
                  <Toggle
                    on={settings.notifications.aiTips}
                    onToggle={() => updateSetting('notifications', 'aiTips', !settings.notifications.aiTips)}
                  />
                </div>
              </div>
            </div>

            {/* Appearance Section */}
<div className="settings__group">
                <div className="settings__group-title">Appearance</div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Sound Effects</div>
                  <div className="settings__item-desc">Block placing sounds</div>
                </div>
                <div className="settings__item-control">
                  <Toggle
                    on={settings.appearance.soundEffects}
                    onToggle={() => updateSetting('appearance', 'soundEffects', !settings.appearance.soundEffects)}
                  />
                </div>
              </div>

              <div className="settings__item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div className="settings__item-label">Sound Volume</div>
                  <div
                    style={{
                      fontFamily: "'VT323', monospace",
                      fontSize: '18px',
                      color: 'var(--mc-gold)',
                    }}
                  >
                    {settings.appearance.volume}%
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.appearance.volume}
                  onChange={(e) => updateSetting('appearance', 'volume', Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--mc-gold)' }}
                  aria-label="Sound volume"
                />
              </div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Currency</div>
                  <div className="settings__item-desc">Display currency format</div>
                </div>
                <div className="settings__item-control">
                  <select
                    className="settings__select"
                    value={settings.appearance.currency}
                    onChange={(e) => updateSetting('appearance', 'currency', e.target.value)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="PHP">PHP (₱)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Theme</div>
                  <div className="settings__item-desc">Light or dark mode</div>
                </div>
                <div className="settings__item-control">
                  <select
                    className="settings__select"
                    value={settings.appearance.theme || 'dark'}
                    onChange={(e) => updateSetting('appearance', 'theme', e.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Sound Pack</div>
                  <div className="settings__item-desc">Choose your audio theme</div>
                </div>
                <div className="settings__item-control">
                  <select
                    className="settings__select"
                    value={settings.appearance.soundPack || 'classic'}
                    onChange={(e) => updateSetting('appearance', 'soundPack', e.target.value)}
                  >
                    {SOUND_PACKS.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Couple Section */}
            <div className="settings__group">
              <div className="settings__group-title">Couple</div>

              {coupleInfo?.partner ? (
                <>
                  <div className="settings__item">
                    <div className="settings__item-info">
                      <div className="settings__item-label">Connected Partner</div>
                      <div className="settings__item-desc">
                        {coupleInfo.partner.username || 'Partner'}
                      </div>
                    </div>
                  </div>
                  <div className="settings__item">
                    <div className="settings__item-info">
                      <div className="settings__item-label">Disconnect</div>
                      <div className="settings__item-desc">Remove partner connection</div>
                    </div>
                    <div className="settings__item-control">
                      <Button variant="danger" size="sm" onClick={handleDisconnect} disabled={saving}>
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="settings__item">
                  <div className="settings__item-info">
                    <div className="settings__item-label">No Partner Connected</div>
                    <div className="settings__item-desc">Invite someone to save together</div>
                  </div>
                  <div className="settings__item-control">
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { data } = await api.post('/auth/couple/invite');
                          showToast(`Code: ${data.inviteCode || data.code}`);
                        } catch (err) {
                          showToast(err.response?.data?.message || 'Failed to generate code');
                        }
                      }}
                    >
                      Invite Partner
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Data Section */}
            <div className="settings__group">
              <div className="settings__group-title">Data</div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Export My Data</div>
                  <div className="settings__item-desc">Download all your data as JSON</div>
                </div>
                <div className="settings__item-control">
                  <Button variant="secondary" size="sm" onClick={handleExportData} disabled={saving}>
                    Export
                  </Button>
                </div>
              </div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Savings Report</div>
                  <div className="settings__item-desc">Download a PDF summary of your savings</div>
                </div>
                <div className="settings__item-control">
                  <Button variant="secondary" size="sm" onClick={exportSavingsPDF}>
                    PDF
                  </Button>
                </div>
              </div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Clear All Savings Data</div>
                  <div className="settings__item-desc">Remove all goals and transactions</div>
                </div>
                <div className="settings__item-control">
                  <Button variant="danger" size="sm" onClick={handleClearData} disabled={saving}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="settings__group settings__danger">
              <div className="settings__group-title">Danger Zone</div>

              <div className="settings__item">
                <div className="settings__item-info">
                  <div className="settings__item-label">Delete Account</div>
                  <div className="settings__item-desc">Permanently delete your account and all data</div>
                </div>
                <div className="settings__item-control">
                  <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__title">Delete Account</div>
              <button
                className="modal__close"
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
              >
                ×
              </button>
            </div>
            <div className="modal__body">
              <p
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: '22px',
                  color: 'var(--mc-text)',
                  marginBottom: '16px',
                }}
              >
                Are you sure? This will permanently delete your account and all data.
                This action cannot be undone.
              </p>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '9px',
                  color: 'var(--mc-redstone)',
                  textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                  marginBottom: '12px',
                  lineHeight: '2',
                }}
              >
                Type DELETE to confirm:
              </div>
              <Input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="DELETE"
                name="delete-confirm"
              />
            </div>
            <div className="modal__footer">
              <Button
                variant="secondary"
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={deleteText !== 'DELETE' || saving}
              >
                Delete Forever
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
