import { useState, useMemo } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { useSettings } from '../../context/SettingsContext';

const INITIAL_STATE = {
  name: '',
  targetAmount: '',
  timesPerWeek: '',
  amountPerDeposit: '',
  deadline: '',
};

export default function GoalForm({ onSubmit, initialData, onCancel }) {
  const { formatCurrency, currency } = useSettings();
  const [form, setForm] = useState(
    initialData
      ? {
          name: initialData.goalName || initialData.name || '',
          targetAmount: initialData.targetAmount?.toString() || '',
          timesPerWeek: initialData.timesPerWeek?.toString() || '',
          amountPerDeposit: initialData.amountPerDeposit?.toString() || '',
          deadline: initialData.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '',
        }
      : INITIAL_STATE
  );
  const [errors, setErrors] = useState({});

  const weeklyTotal = useMemo(() => {
    const t = parseFloat(form.timesPerWeek);
    const a = parseFloat(form.amountPerDeposit);
    if (isNaN(t) || isNaN(a) || t <= 0 || a <= 0) return null;
    return t * a;
  }, [form.timesPerWeek, form.amountPerDeposit]);

  const weeksRemaining = useMemo(() => {
    const remaining = parseFloat(form.targetAmount);
    if (!weeklyTotal || !remaining || remaining <= 0) return null;
    const target = remaining - (initialData?.currentAmount || 0);
    if (target <= 0) return 0;
    return Math.ceil(target / weeklyTotal);
  }, [weeklyTotal, form.targetAmount, initialData]);

  const estimatedCompletion = useMemo(() => {
    if (!weeksRemaining && weeksRemaining !== 0) return null;
    const date = new Date();
    date.setDate(date.getDate() + weeksRemaining * 7);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [weeksRemaining]);

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'name') {
      value = value.slice(0, 60);
    } else {
      value = value.replace(/[^0-9.]/g, '');
      if (value.includes('.')) {
        const parts = value.split('.');
        value = parts[0] + '.' + (parts[1] || '').slice(0, 2);
      }
    }
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleTimesChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      const num = parseInt(value, 10);
      if (num > 7) value = '7';
      if (num < 1 && value !== '') value = '1';
    }
    setForm((prev) => ({ ...prev, timesPerWeek: value }));
    if (errors.timesPerWeek) {
      setErrors((prev) => ({ ...prev, timesPerWeek: null }));
    }
  };

  const validate = () => {
    const errs = {};

    if (!form.name.trim()) errs.name = 'Enter a goal name';
    if (!form.targetAmount || parseFloat(form.targetAmount) <= 0)
      errs.targetAmount = 'Enter a valid amount';
    if (!form.timesPerWeek || parseInt(form.timesPerWeek, 10) < 1 || parseInt(form.timesPerWeek, 10) > 7)
      errs.timesPerWeek = 'Enter 1-7 times per week';
    if (!form.amountPerDeposit || parseFloat(form.amountPerDeposit) <= 0)
      errs.amountPerDeposit = 'Enter a valid deposit amount';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      goalName: form.name.trim(),
      targetAmount: parseFloat(form.targetAmount),
      timesPerWeek: parseInt(form.timesPerWeek, 10),
      amountPerDeposit: parseFloat(form.amountPerDeposit),
      deadline: form.deadline || null,
    });
  };

  const isEditing = !!initialData;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div className="modal__header">
          <div className="modal__title">
            {isEditing ? 'Edit Goal' : 'New Goal'}
          </div>
          <button className="modal__close" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Goal Name"
              name="goalName"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g., Vacation Fund"
              error={errors.name}
            />

            <Input
              label={`Target Amount (${currency.symbol})`}
              name="targetAmount"
              type="text"
              inputMode="decimal"
              value={form.targetAmount}
              onChange={handleChange('targetAmount')}
              placeholder="0.00"
              error={errors.targetAmount}
            />

            <Input
              label="Times Per Week (1-7)"
              name="timesPerWeek"
              type="text"
              inputMode="numeric"
              value={form.timesPerWeek}
              onChange={handleTimesChange}
              placeholder="e.g., 3"
              error={errors.timesPerWeek}
            />

            <Input
              label={`Amount Per Deposit (${currency.symbol})`}
              name="amountPerDeposit"
              type="text"
              inputMode="decimal"
              value={form.amountPerDeposit}
              onChange={handleChange('amountPerDeposit')}
              placeholder="0.00"
              error={errors.amountPerDeposit}
            />

            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>
                DEADLINE (optional)
              </div>
              <input
                type="date"
                className="mc-input"
                value={form.deadline}
                onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                style={{ width: '100%', color: 'var(--mc-text)' }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Auto-calculate section */}
            {weeklyTotal !== null && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '2px solid var(--mc-border-dark)',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '8px',
                    color: 'var(--mc-diamond)',
                    textShadow: '1px 1px 0 var(--mc-text-shadow)',
                    marginBottom: '10px',
                  }}
                >
                  Calculation
                </div>
                <div
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: '20px',
                    color: '#CCC',
                    lineHeight: '1.6',
                  }}
                >
                  <div>
                    Weekly total:{' '}
                    <span style={{ color: 'var(--mc-gold)' }}>
                      {form.timesPerWeek} × {formatCurrency(parseFloat(form.amountPerDeposit))} = {formatCurrency(weeklyTotal)}
                    </span>
                  </div>
                  {weeksRemaining !== null && (
                    <>
                      <div>
                        Weeks remaining:{' '}
                        <span style={{ color: 'var(--mc-emerald)' }}>{weeksRemaining}</span>
                      </div>
                      <div>
                        Estimated completion:{' '}
                        <span style={{ color: 'var(--mc-diamond)' }}>{estimatedCompletion}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal__footer">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? 'Update Goal' : 'Set Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
