import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { PixelAvatar } from '../utils/avatar';

function CoupleDisplay({ partner1, partner2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ fontSize: '20px' }}>{partner1?.avatar ? <PixelAvatar avatar={partner1.avatar} size={24} /> : '👤'}</div>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: '14px', color: '#CCC' }}>♥</span>
      <div style={{ fontSize: '20px' }}>{partner2?.avatar ? <PixelAvatar avatar={partner2.avatar} size={24} /> : '👤'}</div>
    </div>
  );
}

const RANK_ICONS = ['👑', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { formatCurrency } = useSettings();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [nextMilestone, setNextMilestone] = useState(null);
  const [daysTogether, setDaysTogether] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('leaderboard');

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await api.get('/couple/leaderboard');
      setLeaderboard(data.leaderboard || []);
      setMyRank(data.myRank || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMilestones = useCallback(async () => {
    try {
      const { data } = await api.get('/couple/milestones');
      setNextMilestone(data.nextMilestone || null);
      setDaysTogether(data.daysTogether || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'leaderboard') fetchLeaderboard();
    else fetchMilestones();
  }, [tab, fetchLeaderboard, fetchMilestones]);

  if (loading) {
    return (
      <div className="page">
        <div className="page__header"><h1 className="page__title">Leaderboard</h1></div>
        <div className="page__body" style={{ textAlign: 'center', padding: '60px 24px', color: '#888', fontFamily: "'VT323', monospace", fontSize: '20px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Leaderboard</h1>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 24px', marginBottom: '20px' }}>
        {[
          { key: 'leaderboard', label: '🏆 Rankings' },
          { key: 'milestones', label: '🗓️ Milestones' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: '8px', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'var(--mc-gold)' : 'rgba(255,255,255,0.06)',
            color: tab === t.key ? '#000' : '#AAA',
          }}>{t.label}</button>
        ))}
      </div>

      {error && (
        <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: 'var(--mc-redstone)', padding: '0 24px', marginBottom: '12px' }}>{error}</div>
      )}

      <div className="page__body" style={{ padding: '0 24px' }}>
        {tab === 'leaderboard' ? (
          <>
            {/* My Rank */}
            {myRank && (
              <div className="mc-block" style={{ padding: '12px 16px', marginBottom: '16px', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px', color: 'var(--mc-gold)' }}>#{myRank.rank}</div>
                    <CoupleDisplay partner1={myRank.partner1} partner2={myRank.partner2} />
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#CCC' }}>You</div>
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--mc-gold)' }}>{formatCurrency(myRank.totalSaved)}</div>
                </div>
              </div>
            )}

            {leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🏆</div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#888', lineHeight: '2' }}>
                  No activity this week yet!<br />Start saving to climb the ranks.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leaderboard.map((entry) => {
                  const isMe = myRank && entry.coupleId === myRank.coupleId;
                  return (
                    <div key={entry.coupleId} className="mc-block" style={{
                      padding: '12px 16px',
                      background: isMe ? 'rgba(255,215,0,0.08)' : 'var(--mc-stone-dark)',
                      border: isMe ? '1px solid rgba(255,215,0,0.2)' : '1px solid var(--mc-border-dark)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: entry.rank <= 3 ? '14px' : '10px', color: entry.rank <= 3 ? 'var(--mc-gold)' : '#888', width: '32px', textAlign: 'center' }}>
                            {entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : `#${entry.rank}`}
                          </div>
                          <CoupleDisplay partner1={entry.partner1} partner2={entry.partner2} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--mc-gold)' }}>{formatCurrency(entry.totalSaved)}</div>
                          <div style={{ fontFamily: "'VT323', monospace", fontSize: '14px', color: '#888' }}>{entry.depositCount} deposits</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Milestones Tab */
          <>
            <div className="mc-block" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center', background: 'rgba(255,215,0,0.05)' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '14px', color: 'var(--mc-gold)', marginBottom: '8px' }}>
                {daysTogether} DAYS
              </div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: '20px', color: '#AAA' }}>together so far</div>
              {nextMilestone && (
                <div style={{ marginTop: '12px', fontFamily: "'VT323', monospace", fontSize: '18px', color: 'var(--mc-diamond)' }}>
                  Next milestone: {nextMilestone.icon} {nextMilestone.name} in {nextMilestone.days - daysTogether} days
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MILESTONES_DATA.map((m) => {
                const achieved = daysTogether >= m.days;
                return (
                  <div key={m.days} className="mc-block" style={{
                    padding: '12px 16px',
                    background: achieved ? 'rgba(0,200,83,0.08)' : 'var(--mc-stone-dark)',
                    border: achieved ? '1px solid rgba(0,200,83,0.2)' : '1px solid var(--mc-border-dark)',
                    opacity: achieved ? 1 : 0.5,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '24px' }}>{m.icon}</div>
                        <div>
                          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: achieved ? 'var(--mc-emerald)' : '#888' }}>
                            {m.name}
                          </div>
                          <div style={{ fontFamily: "'VT323', monospace", fontSize: '15px', color: '#666' }}>
                            {m.days} days
                          </div>
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: achieved ? 'var(--mc-emerald)' : '#555' }}>
                        {achieved ? '✓ ACHIEVED' : `${m.days - daysTogether}d left`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const MILESTONES_DATA = [
  { days: 1, name: 'First Day', icon: '🌱' },
  { days: 7, name: 'One Week!', icon: '🗓️' },
  { days: 30, name: 'One Month!', icon: '🌙' },
  { days: 60, name: 'Two Months!', icon: '⭐' },
  { days: 100, name: '100 Days!', icon: '💯' },
  { days: 180, name: 'Half Year!', icon: '🏅' },
  { days: 365, name: 'One Year!', icon: '👑' },
  { days: 730, name: 'Two Years!', icon: '💎' },
];
