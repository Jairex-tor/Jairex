import { useMemo } from 'react';

const VARIANT_STYLES = {
  dirt: {
    backgroundColor: 'var(--mc-dirt)',
    backgroundImage: `
      repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px),
      repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 5px)
    `,
  },
  stone: {
    backgroundColor: 'var(--mc-stone-dark)',
    backgroundImage: `
      repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.04) 8px, rgba(0,0,0,0.04) 16px)
    `,
  },
  wood: {
    backgroundColor: 'var(--mc-wood)',
    backgroundImage: `
      repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(0,0,0,0.06) 6px, rgba(0,0,0,0.06) 7px)
    `,
  },
  diamond: {
    backgroundColor: 'var(--mc-diamond)',
    backgroundImage: `
      radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)
    `,
  },
  obsidian: {
    backgroundColor: 'var(--mc-obsidian)',
    backgroundImage: `
      radial-gradient(ellipse at 20% 50%, rgba(75,0,130,0.15) 0%, transparent 70%)
    `,
  },
};

const TITLE_COLORS = {
  dirt: 'var(--mc-gold)',
  stone: 'var(--mc-text)',
  wood: 'var(--mc-dirt-dark)',
  diamond: 'var(--mc-obsidian)',
  obsidian: 'var(--mc-gold)',
};

export default function BlockCard({
  children,
  title,
  className = '',
  onClick,
  variant = 'dirt',
  style: styleProp,
}) {
  const isClickable = !!onClick;

  const cardStyle = useMemo(() => ({
    ...VARIANT_STYLES[variant],
    boxShadow: 'inset -2px -2px 0 var(--mc-border-dark), inset 2px 2px 0 var(--mc-border-light)',
    padding: '16px',
    borderRadius: '2px',
    position: 'relative',
    overflow: 'hidden',
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'filter 0.1s',
    ...styleProp,
  }), [variant, isClickable, styleProp]);

  const titleStyle = useMemo(() => ({
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '12px',
    color: TITLE_COLORS[variant] || 'var(--mc-gold)',
    textShadow: '1px 1px 0 var(--mc-text-shadow)',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '3px solid var(--mc-border-dark)',
  }), [variant]);

  const overlayStyle = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
  };

  return (
    <div
      className={`mc-block ${className}`}
      style={cardStyle}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
    >
      <div style={overlayStyle} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {title && <div style={titleStyle}>{title}</div>}
        {children}
      </div>
    </div>
  );
}
