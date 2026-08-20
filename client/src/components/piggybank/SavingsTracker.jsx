import { useState, useMemo } from 'react';
import ProgressBar from '../common/ProgressBar';
import Button from '../common/Button';
import { useSettings } from '../../context/SettingsContext';

const QUICK_AMOUNTS = [5, 10, 25, 50];

function DepositModal({ goal, onSubmit, onClose }) {
  const { formatCurrency } = useSettings();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [coinBurst, setCoinBurst] = useState(false);

  const handleQuick = (val) => {
    setAmount(val.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    setSubmitting(true);
    setCoinBurst(true);
    await onSubmit({ amount: parsed, note: note.trim() });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">Add Money</div>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '9px',
                color: '#AAA',
                textShadow: '1px 1px 0 var(--mc-text-shadow)',
              }}
            >
              Depositing to: <span style={{ color: 'var(--mc-diamond)' }}>{goal.name}</span>
            </div>

            {/* Quick amounts */}
            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  color: 'var(--mc-text)',
                  textShadow: '1px 1px 0 var(--mc-text-shadow)',
                  marginBottom: '8px',
                }}
              >
                Quick Amount
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="mc-slot"
                    style={{
                      width: '100%',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow:
                        amount === val.toString()
                          ? 'inset -1px -1px 0 var(--mc-border-dark), inset 1px 1px 0 var(--mc-border-light), 0 0 0 2px var(--mc-gold)'
                          : undefined,
                    }}
                    onClick={() => handleQuick(val)}
                  >
                    <span
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '9px',
                        color: 'var(--mc-gold)',
                        textShadow: '1px 1px 0 var(--mc-text-shadow)',
                      }}
                    >
                      {formatCurrency(val)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  color: 'var(--mc-text)',
                  textShadow: '1px 1px 0 var(--mc-text-shadow)',
                  marginBottom: '6px',
                }}
              >
                Or Enter Custom Amount
              </div>
              <input
                type="text"
                inputMode="decimal"
                className="mc-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9.]/g, '');
                  if (v.includes('.')) {
                    const parts = v.split('.');
                    v = parts[0] + '.' + (parts[1] || '').slice(0, 2);
                  }
                  setAmount(v);
                }}
                style={{ fontSize: '22px' }}
              />
            </div>

            {/* Optional note */}
            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  color: 'var(--mc-text)',
                  textShadow: '1px 1px 0 var(--mc-text-shadow)',
                  marginBottom: '6px',
                }}
              >
                Note (optional)
              </div>
              <input
                type="text"
                className="mc-input"
                placeholder="e.g., birthday money"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 100))}
              />
            </div>

            {coinBurst && (
              <div
                style={{
                  position: 'relative',
                  height: '40px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <svg
                    key={i}
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    style={{
                      animation: `coinBurst${i} 0.7s ease-out forwards`,
                    }}
                  >
                    <circle cx="10" cy="10" r="8" fill="var(--mc-gold)" stroke="var(--mc-gold)" strokeWidth="1.5" />
                    <text x="10" y="14" textAnchor="middle" fontSize="10" fontFamily="'Press Start 2P'" fill="#B8860B">$</text>
                  </svg>
                ))}
              </div>
            )}
          </div>

          <div className="modal__footer">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={!amount || parseFloat(amount) <= 0 || submitting}>
              Add Money
            </Button>
          </div>
        </form>

        <style>{`
          @keyframes coinBurst0 {
            0% { transform: translateY(0) scale(0.5); opacity: 1; }
            100% { transform: translateY(-30px) translateX(-15px) scale(1.2); opacity: 0; }
          }
          @keyframes coinBurst1 {
            0% { transform: translateY(0) scale(0.5); opacity: 1; }
            100% { transform: translateY(-35px) scale(1.2); opacity: 0; }
          }
          @keyframes coinBurst2 {
            0% { transform: translateY(0) scale(0.5); opacity: 1; }
            100% { transform: translateY(-30px) translateX(15px) scale(1.2); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}

function daysUntilCompletion(currentAmount, targetAmount, timesPerWeek, amountPerDeposit) {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  const weekly = timesPerWeek * amountPerDeposit;
  if (weekly <= 0) return null;
  const weeks = Math.ceil(remaining / weekly);
  return weeks * 7;
}

function GoalCard({ goal, onDeposit, onEdit, onDelete }) {
  const { formatCurrency } = useSettings();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const daysLeft = daysUntilCompletion(
    goal.currentAmount,
    goal.targetAmount,
    goal.timesPerWeek,
    goal.amountPerDeposit
  );
  const isComplete = goal.currentAmount >= goal.targetAmount;

  return (
    <div
      className="mc-block"
      style={{
        background: 'var(--mc-stone-dark)',
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.04) 8px, rgba(0,0,0,0.04) 16px)',
        boxShadow: 'inset -2px -2px 0 var(--mc-border-dark), inset 2px 2px 0 var(--mc-border-light)',
        padding: '16px',
        animation: 'slide-up 0.3s ease-out',
        borderLeft: isComplete ? '4px solid var(--mc-emerald)' : undefined,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '10px',
              color: isComplete ? 'var(--mc-emerald)' : 'var(--mc-text)',
              textShadow: '1px 1px 0 var(--mc-text-shadow)',
            }}
          >
            {isComplete ? '✓ ' : ''}{goal.name}
          </div>
          {goal.userId?.username && (
            <div
              style={{
                fontFamily: "'VT323', monospace",
                fontSize: '16px',
                color: '#888',
                marginTop: '2px',
              }}
            >
              by {goal.userId.username}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {!isComplete && (
            <button
              className="mc-button mc-button--small"
              style={{ fontSize: '8px', padding: '5px 10px' }}
              onClick={() => onEdit(goal)}
            >
              Edit
            </button>
          )}
          {!confirmDelete ? (
            <button
              className="mc-button mc-button--danger mc-button--small"
              style={{ fontSize: '8px', padding: '5px 10px' }}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="mc-button mc-button--danger mc-button--small"
                style={{ fontSize: '7px', padding: '4px 8px' }}
                onClick={() => { onDelete(goal); setConfirmDelete(false); }}
              >
                Confirm
              </button>
              <button
                className="mc-button mc-button--small"
                style={{ fontSize: '7px', padding: '4px 8px' }}
                onClick={() => setConfirmDelete(false)}
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar
        value={goal.currentAmount}
        max={goal.targetAmount}
        showText
        color={isComplete ? 'diamond' : 'green'}
        height={24}
      />

      {/* Info rows */}
      <div
        style={{
          fontFamily: "'VT323', monospace",
          fontSize: '20px',
          color: '#CCC',
          marginTop: '10px',
          lineHeight: '1.5',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            <span style={{ color: 'var(--mc-gold)', fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}>
              {formatCurrency(goal.currentAmount)}
            </span>
            {' / '}
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#AAA' }}>
              {formatCurrency(goal.targetAmount)}
            </span>
          </span>
        </div>
        <div style={{ color: '#888', fontSize: '18px' }}>
          {goal.timesPerWeek} times/week × {formatCurrency(goal.amountPerDeposit)}
        </div>
        {!isComplete && daysLeft !== null && (
          <div style={{ color: 'var(--mc-diamond)', fontSize: '18px' }}>
            ~{daysLeft} days until completion
          </div>
        )}
      </div>

      {/* Deposit button */}
      {!isComplete && (
        <div style={{ marginTop: '12px' }}>
          <Button variant="gold" fullWidth onClick={() => onDeposit(goal)}>
            Deposit
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SavingsTracker({ goals = [], onDeposit, onEdit, onDelete }) {
  const [depositGoal, setDepositGoal] = useState(null);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      const aComplete = a.currentAmount >= a.targetAmount;
      const bComplete = b.currentAmount >= b.targetAmount;
      if (aComplete !== bComplete) return aComplete ? 1 : -1;
      const aPct = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
      const bPct = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
      return aPct - bPct;
    });
  }, [goals]);

  const handleDepositSubmit = async (data) => {
    if (depositGoal) {
      await onDeposit(depositGoal._id || depositGoal.id, data);
    }
    setDepositGoal(null);
  };

  if (goals.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🐷</div>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '10px',
            color: '#888',
            lineHeight: '2',
          }}
        >
          No goals yet!
          <br />
          Create your first savings goal.
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sortedGoals.map((goal) => (
          <GoalCard
            key={goal._id || goal.id}
            goal={goal}
            onDeposit={(g) => setDepositGoal(g)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {depositGoal && (
        <DepositModal
          goal={depositGoal}
          onSubmit={handleDepositSubmit}
          onClose={() => setDepositGoal(null)}
        />
      )}
    </>
  );
}
