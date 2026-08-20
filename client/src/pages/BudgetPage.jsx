import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

const CATEGORY_COLORS = {
  food: '#FF6B35',
  entertainment: '#A855F7',
  gifts: '#EC4899',
  travel: '#3B82F6',
  shopping: '#F59E0B',
  bills: '#EF4444',
  savings: '#10B981',
  other: '#6B7280',
};

function PieChart({ segments, size = 200 }) {
  if (!segments.length) return null;
  const radius = size / 2;
  const cx = radius;
  const cy = radius;

  let accumulated = 0;
  const paths = segments.map((seg) => {
    const startAngle = (accumulated / 100) * 360;
    accumulated += seg.percentage;
    const endAngle = (accumulated / 100) * 360;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    if (seg.percentage >= 99.9) {
      return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`;
    }
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill={segments[i].color} stroke="var(--mc-obsidian)" strokeWidth="2" />
      ))}
      <circle cx={cx} cy={cy} r={radius * 0.45} fill="var(--mc-obsidian)" />
    </svg>
  );
}

export default function BudgetPage() {
  const { formatCurrency } = useSettings();
  const [breakdown, setBreakdown] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    try {
      const { data } = await api.get('/budget/breakdown');
      setBreakdown(data.breakdown || []);
      setGrandTotal(data.grandTotal || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBreakdown(); }, [fetchBreakdown]);

  if (loading) {
    return (
      <div className="page">
        <div className="page__header"><h1 className="page__title">Budget Breakdown</h1></div>
        <div className="page__body" style={{ textAlign: 'center', padding: '60px 24px', color: '#888', fontFamily: "'VT323', monospace", fontSize: '20px' }}>Loading...</div>
      </div>
    );
  }

  const chartSegments = breakdown.map((c) => ({
    ...c,
    color: CATEGORY_COLORS[c.category] || '#6B7280',
  }));

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Budget Breakdown</h1>
      </div>

      {error && (
        <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: 'var(--mc-redstone)', padding: '0 24px', marginBottom: '12px' }}>{error}</div>
      )}

      <div className="page__body" style={{ padding: '0 24px' }}>
        {breakdown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📊</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#888', lineHeight: '2' }}>
              No spending data yet!<br />Add deposits with categories.
            </div>
          </div>
        ) : (
          <>
            {/* Pie Chart */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                <PieChart segments={chartSegments} size={200} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--mc-gold)' }}>{formatCurrency(grandTotal)}</div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: '14px', color: '#888' }}>Total</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {breakdown.map((cat) => (
                <div key={cat.category} className="mc-block" style={{
                  padding: '10px 14px', background: 'var(--mc-stone-dark)',
                  boxShadow: 'inset -1px -1px 0 var(--mc-border-dark), inset 1px 1px 0 var(--mc-border-light)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '2px',
                    background: CATEGORY_COLORS[cat.category] || '#6B7280', flexShrink: 0,
                  }} />
                  <div style={{ fontSize: '18px', flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--mc-text)', textTransform: 'capitalize' }}>
                      {cat.category}
                    </div>
                    <div style={{ fontFamily: "'VT323', monospace", fontSize: '14px', color: '#888' }}>
                      {cat.count} transactions
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: 'var(--mc-gold)' }}>{formatCurrency(cat.total)}</div>
                    <div style={{ fontFamily: "'VT323', monospace", fontSize: '14px', color: '#888' }}>{cat.percentage}%</div>
                  </div>
                  {/* Mini bar */}
                  <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: `${cat.percentage}%`, height: '100%', background: CATEGORY_COLORS[cat.category] || '#6B7280', borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
