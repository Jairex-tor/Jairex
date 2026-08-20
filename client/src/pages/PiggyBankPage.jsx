import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PiggyBank from '../components/piggybank/PiggyBank';
import GoalForm from '../components/piggybank/GoalForm';
import SavingsTracker from '../components/piggybank/SavingsTracker';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { playDeposit, playAchievement } from '../utils/sounds';
import useSocket from '../hooks/useSocket';

const CONFETTI_COLORS = ['#FCDB05', '#55FF55', '#55FFFF', '#FF55FF', '#FF5555', '#FF9B50'];

export default function PiggyBankPage() {
  const { user } = useAuth();
  const { refresh } = useGamification();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [partner, setPartner] = useState({});
  const [feedTrigger, setFeedTrigger] = useState(0);
  const [inCouple, setInCouple] = useState(true);
  const [celebrate, setCelebrate] = useState(null);

  useEffect(() => {
    api.get('/auth/couple').then(({ data }) => {
      const couple = data.couple || data;
      const p = couple?.partner || null;
      if (p) {
        setPartner({ avatar: p.avatar, username: p.username });
      }
      if (couple) setInCouple(true);
    }).catch(() => {
      setInCouple(false);
    });
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/savings/goals');
      setGoals(data.goals || data || []);
    } catch (err) {
      if (err.response?.status === 400) {
        setInCouple(false);
        setGoals([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load goals');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Realtime sync: refetch goals when partner creates/updates/deposits
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      fetchGoals();
    };
    socket.on('savings-changed', handler);
    return () => socket.off('savings-changed', handler);
  }, [socket, fetchGoals]);

  const combinedCurrent = useMemo(
    () => goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0),
    [goals]
  );

  const combinedTarget = useMemo(
    () => goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0),
    [goals]
  );

  const handleCreateGoal = async (formData) => {
    try {
      setError(null);
      const { data } = await api.post('/savings/goal', formData);
      setGoals((prev) => [...prev, data.goal || data]);
      setShowGoalForm(false);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create goal');
    }
  };

  const handleUpdateGoal = async (formData) => {
    try {
      setError(null);
      const id = editingGoal._id || editingGoal.id;
      const { data } = await api.put(`/savings/goal/${id}`, formData);
      setGoals((prev) =>
        prev.map((g) => ((g._id || g.id) === id ? (data.goal || data) : g))
      );
      setEditingGoal(null);
      setShowGoalForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update goal');
    }
  };

  const handleDeleteGoal = async (goal) => {
    try {
      setError(null);
      const id = goal._id || goal.id;
      await api.delete(`/savings/goal/${id}`);
      setGoals((prev) => prev.filter((g) => (g._id || g.id) !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete goal');
    }
  };

  const handleDeposit = async (goalId, depositData) => {
    try {
      setError(null);
      const prevGoal = goals.find((g) => (g._id || g.id) === goalId);
      const wasComplete = !!prevGoal && (prevGoal.currentAmount || 0) >= (prevGoal.targetAmount || 0);
      const { data } = await api.post(`/savings/goal/${goalId}/deposit`, depositData);
      const updatedGoal = data.goal || data;
      setGoals((prev) =>
        prev.map((g) => ((g._id || g.id) === goalId ? updatedGoal : g))
      );
      playDeposit();
      setFeedTrigger((t) => t + 1);

      const nowComplete = (updatedGoal.currentAmount || 0) >= (updatedGoal.targetAmount || 0);
      if (!wasComplete && nowComplete) {
        playAchievement();
        setCelebrate({ name: updatedGoal.goalName || 'Goal' });
        setTimeout(() => setCelebrate(null), 3200);
      }
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deposit');
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setShowGoalForm(true);
  };

  const handleFormClose = () => {
    setShowGoalForm(false);
    setEditingGoal(null);
  };

  const handleFormSubmit = editingGoal ? handleUpdateGoal : handleCreateGoal;

  return (
    <div className="page">
      {/* Goal completion celebration */}
      {celebrate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(14px, 4vw, 26px)',
              color: 'var(--mc-gold)',
              textShadow: '3px 3px 0 #3A2A0A, 0 0 30px rgba(252,219,5,0.6)',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.65)',
              border: '3px solid var(--mc-gold)',
              padding: '20px 28px',
              animation: 'celebrationPop 0.4s ease-out',
            }}
          >
            🎉 GOAL COMPLETE! 🎉
            <div
              style={{
                fontFamily: "'VT323', monospace",
                fontSize: 'clamp(18px, 4vw, 28px)',
                color: '#fff',
                marginTop: '8px',
              }}
            >
              "{celebrate.name}" is fully saved!
            </div>
          </div>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                position: 'fixed',
                left: `${(i * 37) % 100}%`,
                top: '-20px',
                width: '10px',
                height: '14px',
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animation: `confettiFall ${1.6 + (i % 5) * 0.3}s ease-in ${(i % 7) * 0.12}s forwards`,
              }}
            />
          ))}
          <style>{`
            @keyframes celebrationPop {
              0% { transform: scale(0.5); opacity: 0; }
              60% { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes confettiFall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}
      <div className="page__header">
        <div className="page__header-title">Piggy Bank</div>
        <div className="page__header-actions">
          {goals.length > 0 && (
            <Button variant="gold" size="sm" onClick={() => setShowGoalForm(true)}>
              + New Goal
            </Button>
          )}
        </div>
      </div>

      <div className="page__body">
        {loading ? (
          /* Loading skeleton */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div
                style={{
                  width: '200px',
                  height: '160px',
                  margin: '0 auto 16px',
                }}
                className="skeleton"
              />
              <div className="skeleton skeleton--title" style={{ margin: '0 auto', width: '160px' }} />
            </div>
            <div className="skeleton skeleton--card" style={{ width: '100%', maxWidth: '600px', height: '80px' }} />
            <div className="skeleton skeleton--card" style={{ width: '100%', maxWidth: '600px', height: '80px' }} />
          </div>
        ) : (
          <div className="piggy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
            {/* Error alert */}
            {error && (
              <div
                style={{
                  width: '100%',
                  maxWidth: '600px',
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

            {/* Piggy Bank display */}
            <div
              className="piggy__bank-container"
              style={{ width: '100%', maxWidth: '560px' }}
            >
              <PiggyBank
                currentAmount={combinedCurrent}
                targetAmount={combinedTarget || 1}
                me={{ avatar: user?.avatar, username: user?.username }}
                partner={partner}
                feedTrigger={feedTrigger}
              />
            </div>

            {/* Not linked with partner */}
            {!inCouple && (
              <div
                className="mc-block"
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💑</div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '10px',
                    color: 'var(--mc-text)',
                    textShadow: '1px 1px 0 var(--mc-text-shadow)',
                    lineHeight: '1.8',
                    marginBottom: '12px',
                  }}
                >
                  Link with your partner first to start saving together!
                </div>
                <Button variant="gold" size="sm" onClick={() => navigate('/profile')}>
                  Find Your Partner
                </Button>
              </div>
            )}

            {/* Your Goals heading */}
            {inCouple && goals.length > 0 && (
              <div style={{ width: '100%', maxWidth: '600px' }}>
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '13px',
                    color: 'var(--mc-gold)',
                    textShadow: '2px 2px 0 var(--mc-text-shadow)',
                    marginBottom: '4px',
                  }}
                >
                  Your Goals
                </div>
                <div
                  style={{
                    height: '3px',
                    backgroundColor: 'var(--mc-border-dark)',
                    borderTop: '1px solid var(--mc-border-light)',
                    marginBottom: '16px',
                  }}
                />
              </div>
            )}

            {/* Savings Tracker */}
            {inCouple && (
              <div style={{ width: '100%', maxWidth: '600px' }}>
                <SavingsTracker
                  goals={goals}
                  onDeposit={handleDeposit}
                  onEdit={handleEditGoal}
                  onDelete={handleDeleteGoal}
                />
              </div>
            )}

            {/* Floating add button (mobile / when no goals) */}
            {inCouple && goals.length === 0 && (
              <Button variant="primary" onClick={() => setShowGoalForm(true)}>
                Create Your First Goal
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Goal form modal */}
      {showGoalForm && (
        <GoalForm
          onSubmit={handleFormSubmit}
          initialData={editingGoal}
          onCancel={handleFormClose}
        />
      )}
    </div>
  );
}
