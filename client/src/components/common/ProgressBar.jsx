import { useMemo } from 'react';

const COLOR_MAP = {
  green: 'var(--mc-emerald)',
  gold: 'var(--mc-gold)',
  diamond: 'var(--mc-diamond)',
  red: 'var(--mc-redstone)',
};

const SEGMENT_COUNT = 20;

export default function ProgressBar({
  value = 0,
  max = 100,
  label,
  showText = false,
  color = 'green',
  height = 28,
  className = '',
  style: styleProp,
}) {
  const pct = useMemo(() => {
    const clamped = Math.max(0, Math.min(value, max));
    return max > 0 ? (clamped / max) * 100 : 0;
  }, [value, max]);

  const fillColor = COLOR_MAP[color] || COLOR_MAP.green;

  const containerStyle = useMemo(() => ({
    width: '100%',
    ...styleProp,
  }), [styleProp]);

  const trackStyle = {
    position: 'relative',
    height: `${height}px`,
    backgroundColor: '#2A2A2A',
    border: '3px solid var(--mc-slot-border)',
    boxShadow: 'inset 1px 1px 0 #1A1A1A',
    overflow: 'hidden',
  };

  const fillStyle = {
    height: '100%',
    backgroundColor: fillColor,
    backgroundImage: `
      repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 10px)
    `,
    width: `${pct}%`,
    transition: 'width 0.4s ease',
    position: 'relative',
  };

  const shineStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
  };

  const labelTextStyle = {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '9px',
    color: 'var(--mc-text)',
    textShadow: '1px 1px 0 var(--mc-text-shadow)',
    marginTop: '6px',
  };

  const percentTextStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '9px',
    color: 'var(--mc-text)',
    textShadow: '1px 1px 0 var(--mc-text-shadow)',
    zIndex: 1,
  };

  return (
    <div style={containerStyle} className={className}>
      {label && <div style={labelTextStyle}>{label}</div>}
      <div style={trackStyle}>
        <div style={fillStyle}>
          <div style={shineStyle} />
        </div>
        {/* Segment lines */}
        {Array.from({ length: SEGMENT_COUNT - 1 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${((i + 1) / SEGMENT_COUNT) * 100}%`,
              width: '1px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              pointerEvents: 'none',
            }}
          />
        ))}
        {showText && (
          <span style={percentTextStyle}>
            {Math.round(pct)}%
          </span>
        )}
      </div>
    </div>
  );
}
